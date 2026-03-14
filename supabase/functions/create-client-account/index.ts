// Edge Function: create-client-account
// Cria conta de cliente via Service Role (sem limitações do client SDK público).
// A SUPABASE_SERVICE_ROLE_KEY nunca é exposta no frontend.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateClientRequest {
  name: string;
  email: string;
  password: string;
  phone?: string;
  company_slug: string;
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Método não permitido" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body = (await req.json()) as CreateClientRequest;
    const { name, email, password, phone, company_slug } = body;

    if (!name?.trim() || !email?.trim() || !password?.trim() || !company_slug?.trim()) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Campos obrigatórios: name, email, password, company_slug",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ success: false, error: "Senha deve ter no mínimo 6 caracteres" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return new Response(
        JSON.stringify({ success: false, error: "Configuração do servidor inválida" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Buscar empresa pelo slug
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id, name, status")
      .eq("slug", company_slug.trim())
      .maybeSingle();

    if (companyError || !company) {
      return new Response(
        JSON.stringify({ success: false, error: "Empresa não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (company.status !== "active") {
      return new Response(
        JSON.stringify({ success: false, error: "Empresa não está ativa" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const companyId = company.id;
    const fullName = name.trim();
    const emailTrimmed = email.trim().toLowerCase();

    // 2. Verificar se email já existe
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existing = existingUsers?.users?.find((u) => u.email?.toLowerCase() === emailTrimmed);
    if (existing) {
      // Usuário já existe: garantir vínculo com a empresa em company_clients via RPC
      const { data: ensureResult, error: ensureError } = await supabase.rpc(
        "ensure_company_client",
        {
          p_company_id: companyId,
          p_user_id: existing.id,
          p_full_name: fullName,
          p_phone: phone?.trim() || null,
          p_email: emailTrimmed,
        }
      );

      if (ensureError) {
        console.error("ensure_company_client (existing user):", ensureError);
        return new Response(
          JSON.stringify({ success: false, error: ensureError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const res = ensureResult as { success?: boolean; error?: string } | null;
      if (res && res.success === false && res.error) {
        return new Response(
          JSON.stringify({ success: false, error: res.error }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabase.rpc("link_appointments_to_user", {
        p_user_id: existing.id,
        p_company_id: companyId,
        p_phone: phone?.trim() || null,
        p_email: emailTrimmed,
      });

      return new Response(
        JSON.stringify({
          success: true,
          user_id: existing.id,
          message: "Conta já existia. Vínculo com a empresa adicionado.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Criar usuário via Admin API (sem limitações do client SDK)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: emailTrimmed,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        phone: phone?.trim() || "",
        role: "client",
        company_id: companyId,
        company_slug: company_slug.trim(),
        company_name: company.name,
      },
    });

    if (authError) {
      console.error("auth.admin.createUser error:", authError);
      const msg = authError.message || "Erro ao criar usuário";
      return new Response(
        JSON.stringify({ success: false, error: msg }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = authData.user?.id;
    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: "Usuário criado mas ID não retornado" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Garantir perfil com company_id (trigger pode já ter criado)
    await supabase
      .from("profiles")
      .upsert(
        {
          id: userId,
          full_name: fullName,
          phone: phone?.trim() || null,
          role: "client",
          company_id: companyId,
        },
        { onConflict: "id" }
      );

    // 5. Vincular cliente à empresa (company_clients) via RPC robusta
    const { data: ensureResult, error: ensureError } = await supabase.rpc(
      "ensure_company_client",
      {
        p_company_id: companyId,
        p_user_id: userId,
        p_full_name: fullName,
        p_phone: phone?.trim() || null,
        p_email: emailTrimmed,
      }
    );

    if (ensureError) {
      console.error("ensure_company_client (new user):", ensureError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Erro ao vincular cliente à empresa. Tente novamente.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const res = ensureResult as { success?: boolean; error?: string } | null;
    if (res && res.success === false && res.error) {
      return new Response(
        JSON.stringify({ success: false, error: res.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Vincular agendamentos antigos (walk-in) ao novo usuário por phone/email
    await supabase.rpc("link_appointments_to_user", {
      p_user_id: userId,
      p_company_id: companyId,
      p_phone: phone?.trim() || null,
      p_email: emailTrimmed,
    });

    // Login automático: o frontend fará signInWithPassword após receber sucesso
    // (o usuário já tem a senha e email confirmado)
    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        message: "Conta criada com sucesso.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("create-client-account error:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : "Erro interno",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
