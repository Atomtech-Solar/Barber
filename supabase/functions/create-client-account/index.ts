// Edge Function: create-client-account
// Cria conta de cliente via Service Role (sem limitações do client SDK público).
// A SUPABASE_SERVICE_ROLE_KEY nunca é exposta no frontend.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  assertBrowserPostHeaders,
  corsHeadersForRequest,
  getClientIp,
  jsonResponse,
  mergeHeaders,
  rateLimitExceeded,
  securityHeaders,
  isOriginAllowed,
} from "../_shared/httpSecurity.ts";

interface CreateClientRequest {
  name: string;
  email: string;
  password: string;
  phone?: string;
  company_slug: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    const origin = req.headers.get("origin");
    if (origin && !isOriginAllowed(origin)) {
      return new Response("Forbidden", { status: 403, headers: new Headers(securityHeaders) });
    }
    return new Response("ok", {
      headers: mergeHeaders({
        ...corsHeadersForRequest(req),
        ...securityHeaders,
      }),
    });
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Método não permitido" }, 405, req);
  }

  const ip = getClientIp(req);
  if (rateLimitExceeded(ip)) {
    return jsonResponse(
      { success: false, error: "Muitas tentativas. Aguarde um minuto e tente novamente." },
      429,
      req,
      { "Retry-After": "60" }
    );
  }

  const headerErr = assertBrowserPostHeaders(req);
  if (headerErr) {
    return jsonResponse({ success: false, error: "Requisição não autorizada." }, 403, req);
  }

  try {
    const body = (await req.json()) as CreateClientRequest;
    const { name, email, password, phone, company_slug } = body;

    if (!name?.trim() || !email?.trim() || !password?.trim() || !company_slug?.trim()) {
      return jsonResponse(
        {
          success: false,
          error: "Campos obrigatórios: name, email, password, company_slug",
        },
        400,
        req
      );
    }

    if (password.length < 6) {
      return jsonResponse(
        { success: false, error: "Senha deve ter no mínimo 6 caracteres" },
        400,
        req
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return jsonResponse(
        { success: false, error: "Configuração do servidor inválida" },
        500,
        req
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id, name, status")
      .eq("slug", company_slug.trim())
      .maybeSingle();

    if (companyError || !company) {
      return jsonResponse({ success: false, error: "Empresa não encontrada" }, 404, req);
    }

    if (company.status !== "active") {
      return jsonResponse({ success: false, error: "Empresa não está ativa" }, 400, req);
    }

    const companyId = company.id;
    const fullName = name.trim();
    const emailTrimmed = email.trim().toLowerCase();

    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existing = existingUsers?.users?.find((u) => u.email?.toLowerCase() === emailTrimmed);
    if (existing) {
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
        return jsonResponse(
          { success: false, error: "Não foi possível vincular à empresa. Tente novamente." },
          500,
          req
        );
      }

      const res = ensureResult as { success?: boolean; error?: string } | null;
      if (res && res.success === false && res.error) {
        return jsonResponse({ success: false, error: res.error }, 400, req);
      }

      await supabase.rpc("link_appointments_to_user", {
        p_user_id: existing.id,
        p_company_id: companyId,
        p_phone: phone?.trim() || null,
        p_email: emailTrimmed,
      });

      return jsonResponse(
        {
          success: true,
          user_id: existing.id,
          message: "Conta já existia. Vínculo com a empresa adicionado.",
        },
        200,
        req
      );
    }

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
      return jsonResponse(
        { success: false, error: "Não foi possível criar a conta. Verifique os dados." },
        400,
        req
      );
    }

    const userId = authData.user?.id;
    if (!userId) {
      return jsonResponse(
        { success: false, error: "Não foi possível concluir o cadastro. Tente novamente." },
        500,
        req
      );
    }

    await supabase.from("profiles").upsert(
      {
        id: userId,
        full_name: fullName,
        phone: phone?.trim() || null,
        role: "client",
        company_id: companyId,
      },
      { onConflict: "id" }
    );

    const { data: ensureResult, error: ensureError } = await supabase.rpc("ensure_company_client", {
      p_company_id: companyId,
      p_user_id: userId,
      p_full_name: fullName,
      p_phone: phone?.trim() || null,
      p_email: emailTrimmed,
    });

    if (ensureError) {
      console.error("ensure_company_client (new user):", ensureError);
      return jsonResponse(
        { success: false, error: "Não foi possível vincular cliente à empresa. Tente novamente." },
        500,
        req
      );
    }

    const res = ensureResult as { success?: boolean; error?: string } | null;
    if (res && res.success === false && res.error) {
      return jsonResponse({ success: false, error: res.error }, 400, req);
    }

    await supabase.rpc("link_appointments_to_user", {
      p_user_id: userId,
      p_company_id: companyId,
      p_phone: phone?.trim() || null,
      p_email: emailTrimmed,
    });

    return jsonResponse(
      {
        success: true,
        user_id: userId,
        message: "Conta criada com sucesso.",
      },
      200,
      req
    );
  } catch (err) {
    console.error("create-client-account error:", err);
    return jsonResponse(
      { success: false, error: "Não foi possível concluir a operação. Tente novamente." },
      500,
      req
    );
  }
});
