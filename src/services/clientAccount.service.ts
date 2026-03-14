/**
 * Serviço para criação de conta de cliente via Edge Function.
 * Usa Service Role no backend - a chave sensível NUNCA é exposta no frontend.
 */

export interface CreateClientAccountParams {
  name: string;
  email: string;
  password: string;
  phone?: string;
  company_slug: string;
}

export interface CreateClientAccountResult {
  success: boolean;
  user_id?: string;
  error?: string;
  message?: string;
}

const getFunctionsUrl = () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  if (!url) throw new Error("VITE_SUPABASE_URL não configurada");
  return `${url.replace(/\/$/, "")}/functions/v1`;
};

/**
 * Cria conta de cliente chamando a Edge Function create-client-account.
 * A Edge Function usa SUPABASE_SERVICE_ROLE_KEY para criar o usuário sem
 * as limitações do client SDK público.
 */
export async function createClientAccount(
  params: CreateClientAccountParams
): Promise<CreateClientAccountResult> {
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!anonKey) throw new Error("VITE_SUPABASE_ANON_KEY não configurada");

  const functionsUrl = getFunctionsUrl();
  const endpoint = `${functionsUrl}/create-client-account`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify({
      name: params.name.trim(),
      email: params.email.trim(),
      password: params.password,
      phone: params.phone?.trim() || "",
      company_slug: params.company_slug.trim(),
    }),
  });

  const data = (await res.json()) as CreateClientAccountResult & { error?: string };

  if (!res.ok) {
    return {
      success: false,
      error: data?.error ?? `Erro ${res.status}`,
    };
  }

  return {
    success: data.success ?? true,
    user_id: data.user_id,
    message: data.message,
  };
}
