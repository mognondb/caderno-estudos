// Caderno de Estudos — função "imprensa"
// Busca as matérias novas de Em Defesa do Comunismo (RSS do Ghost) e do Jornal O Futuro
// (páginas do site) e grava título, data, seção e texto na tabela docs do usuário logado.
// Instalação: Supabase › Edge Functions › Deploy a new function › Via Editor › nome "imprensa".

import { createClient } from "npm:@supabase/supabase-js@2";
import { Readability } from "npm:@mozilla/readability@0.5.0";
import { parseHTML } from "npm:linkedom@0.18.5";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const UA = "Mozilla/5.0 (compatible; CadernoDeEstudos/1.0; leitura pessoal)";
const MAX_NOVAS_POR_FONTE = 15;
const MESES: Record<string, number> = { janeiro: 1, fevereiro: 2, "março": 3, marco: 3, abril: 4, maio: 5, junho: 6, julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12 };

const resposta = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...CORS, "Content-Type": "application/json" } });

async function baixar(url: string): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 20000);
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA, "Accept": "text/html,application/xml;q=0.9,*/*;q=0.8" }, signal: ctrl.signal });
    if (!r.ok) throw new Error("HTTP " + r.status + " em " + url);
    return await r.text();
  } finally { clearTimeout(t); }
}

const chaveLink = (u: string) => String(u || "").replace(/^https?:\/\/(www\.)?/i, "").replace(/[?#].*$/, "").replace(/\/+$/, "").toLowerCase();
type Existente = { id: string; data: Record<string, unknown> };
async function idDe(fonte: string, url: string): Promise<string> {
  const h = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(url.replace(/[?#].*$/, "").replace(/\/+$/, "")));
  return fonte + "-" + [...new Uint8Array(h)].slice(0, 10).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const pad = (n: number) => String(n).padStart(2, "0");
const hojeISO = () => { const d = new Date(Date.now() - 3 * 3600e3); return d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate()); };
function dataISO(d: Date | null): string { if (!d || isNaN(d.getTime())) return hojeISO(); const x = new Date(d.getTime() - 3 * 3600e3); return x.getUTCFullYear() + "-" + pad(x.getUTCMonth() + 1) + "-" + pad(x.getUTCDate()); }

const decodificar = (s: string) => s
  .replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "")
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&amp;/g, "&").trim();
const tag = (xml: string, nome: string) => { const m = xml.match(new RegExp("<" + nome + "(?:\\s[^>]*)?>([\\s\\S]*?)</" + nome + ">", "i")); return m ? decodificar(m[1]) : ""; };
const tags = (xml: string, nome: string) => [...xml.matchAll(new RegExp("<" + nome + "(?:\\s[^>]*)?>([\\s\\S]*?)</" + nome + ">", "gi"))].map((m) => decodificar(m[1]));
const textoPuro = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

type Materia = { id: string; fonteId: string; titulo: string; link: string; data: string; secao: string; autor: string; resumo: string; imagem: string; conteudo: string };

/* ---------- Em Defesa do Comunismo (Ghost: RSS com texto completo) ---------- */
async function emDefesa(existentes: Map<string, Existente>): Promise<Materia[]> {
  const base = "https://emdefesadocomunismo.com.br";
  const xml = await baixar(base + "/rss/");
  const itens = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map((m) => m[1]);
  const out: Materia[] = [];
  for (const it of itens) {
    const link = tag(it, "link");
    if (!/^https:\/\//.test(link)) continue;
    const ex = existentes.get(chaveLink(link));
    if (ex && (ex.data.conteudo || ex.data.status === "descartado")) continue;
    const id = ex ? ex.id : await idDe("edc", link);
    let conteudo = tag(it, "content:encoded");
    if (!conteudo) { try { conteudo = (await extrair(link)).conteudo; } catch { conteudo = tag(it, "description"); } }
    const cats = tags(it, "category").filter((c) => !/^recentes?$/i.test(c));
    const img = (it.match(/<media:content[^>]+url="([^"]+)"/i) || [])[1] || "";
    out.push({
      id, fonteId: "edc", titulo: tag(it, "title"), link, data: dataISO(new Date(tag(it, "pubDate"))),
      secao: cats.join(", "), autor: tag(it, "dc:creator"), resumo: textoPuro(tag(it, "description")).slice(0, 400),
      imagem: /^https:\/\//.test(img) ? img : "", conteudo,
    });
    if (out.length >= MAX_NOVAS_POR_FONTE) break;
  }
  return out;
}

/* ---------- extração genérica de uma página de matéria ---------- */
async function extrair(url: string) {
  const html = await baixar(url);
  // deno-lint-ignore no-explicit-any
  const { document } = parseHTML(html) as any;
  const meta = (p: string) => (document.querySelector(`meta[property="${p}"],meta[name="${p}"]`)?.getAttribute("content") || "").trim();
  const tempo = meta("article:published_time") || document.querySelector("time[datetime]")?.getAttribute("datetime") || "";
  const secaoLink = document.querySelector('a[href*="/editoria/"]');
  const textoTopo = (document.body?.textContent || "").slice(0, 6000);
  const art = new Readability(document, { charThreshold: 300 }).parse();
  let data: Date | null = tempo ? new Date(tempo) : null;
  if (!data || isNaN(data.getTime())) {
    const tit = meta("og:title"), i = tit ? textoTopo.indexOf(tit.slice(0, 40)) : -1;
    data = dataNoTexto(i >= 0 ? textoTopo.slice(i) : textoTopo) || dataNoTexto(textoTopo);
  }
  return {
    titulo: meta("og:title") || art?.title || "",
    resumo: meta("og:description") || meta("description") || art?.excerpt || "",
    imagem: meta("og:image"),
    autor: art?.byline || meta("author") || "",
    secao: secaoLink ? (secaoLink.textContent || "").trim() : "",
    data: dataISO(data),
    conteudo: art?.content || "",
  };
}
const MES_RE = "(janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)";
function dataNoTexto(t: string): Date | null {
  let m = t.match(new RegExp("(\\d{1,2})\\s+de\\s+" + MES_RE + "\\s+de\\s+(\\d{4})", "i"));
  if (m) return new Date(Date.UTC(+m[3], MESES[m[2].toLowerCase()] - 1, +m[1], 15));
  m = t.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return new Date(Date.UTC(+m[3], +m[2] - 1, +m[1], 15));
  m = t.match(new RegExp("(\\d{1,2})\\s+de\\s+" + MES_RE, "i"));
  if (m) {
    const mes = MESES[m[2].toLowerCase()] - 1, agora = new Date();
    const ano = mes > agora.getUTCMonth() ? agora.getUTCFullYear() - 1 : agora.getUTCFullYear();
    return new Date(Date.UTC(ano, mes, +m[1], 15));
  }
  return null;
}

/* ---------- Jornal O Futuro (lista de links /artigo/ na capa) ---------- */
async function oFuturo(existentes: Map<string, Existente>): Promise<Materia[]> {
  const base = "https://jornalofuturo.com.br";
  const capa = await baixar(base + "/");
  const links: string[] = [];
  for (const m of capa.matchAll(/href=["']((?:https:\/\/jornalofuturo\.com\.br)?\/artigo\/[^"'#?\s]+)["']/gi)) {
    const u = m[1].startsWith("http") ? m[1] : base + m[1];
    if (!links.includes(u)) links.push(u);
  }
  const out: Materia[] = [];
  for (const link of links) {
    const ex = existentes.get(chaveLink(link));
    if (ex && (ex.data.conteudo || ex.data.status === "descartado")) continue;
    const id = ex ? ex.id : await idDe("ofuturo", link);
    try {
      const x = await extrair(link);
      if (!x.titulo || !x.conteudo) continue;
      out.push({ id, fonteId: "ofuturo", link, ...x, titulo: x.titulo.replace(/\s*[|–-]\s*(Jornal\s+)?O Futuro\s*$/i, ""), resumo: textoPuro(x.resumo).slice(0, 400), imagem: /^https:\/\//.test(x.imagem) ? x.imagem : "" });
    } catch (_) { /* página com problema: tenta na próxima atualização */ }
    if (out.length >= MAX_NOVAS_POR_FONTE) break;
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const auth = req.headers.get("Authorization") || "";
  const chave = req.headers.get("apikey") || Deno.env.get("SUPABASE_ANON_KEY") || "";
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, chave, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data: u, error: eu } = await sb.auth.getUser(auth.replace(/^Bearer\s+/i, ""));
  if (eu || !u?.user) return resposta({ erro: "Faça login no caderno." }, 401);
  const dono = u.user.id;

  const existentes = new Map<string, Existente>();
  for (let de = 0; ; de += 1000) {
    const { data: linhas, error: el } = await sb.from("docs").select("id,data").eq("col", "artigos").range(de, de + 999);
    if (el) return resposta({ erro: "Não consegui ler o banco: " + el.message }, 500);
    for (const r of (linhas || []) as Existente[]) { const k = chaveLink(String(r.data?.link || "")); if (k) existentes.set(k, r); }
    if (!linhas || linhas.length < 1000) break;
  }

  const fontes: Record<string, { novas: number; erro?: string }> = {};
  const todas: Materia[] = [];
  for (const [nome, fn] of [["edc", emDefesa], ["ofuturo", oFuturo]] as const) {
    try { const l = await fn(existentes); todas.push(...l); fontes[nome] = { novas: l.length }; }
    catch (e) { fontes[nome] = { novas: 0, erro: String((e as Error).message || e).slice(0, 200) }; }
  }

  const agora = new Date().toISOString();
  if (todas.length) {
    const rows = todas.map(({ id, ...m }) => {
      const ex = existentes.get(chaveLink(m.link));
      const antigo = ex ? ex.data : null;
      // matéria que já estava no caderno: completa o texto e mantém o que o usuário marcou
      const data = antigo
        ? { ...m, ...Object.fromEntries(Object.entries(antigo).filter(([k, v]) => v !== "" && v != null && !["conteudo", "resumo", "imagem", "autor"].includes(k))), conteudo: m.conteudo, auto: true }
        : { ...m, status: "novo", salvo: false, criado: agora, auto: true };
      return { owner: dono, col: "artigos", id, data, updated_at: agora };
    });
    const { error } = await sb.from("docs").upsert(rows, { onConflict: "owner,col,id" });
    if (error) return resposta({ erro: "Não consegui gravar: " + error.message, fontes }, 500);
  }
  const completadas = todas.filter((m) => existentes.has(chaveLink(m.link))).length;
  return resposta({ novas: todas.length - completadas, completadas, fontes });
});
