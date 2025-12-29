/**
 * Este arquivo é responsável por inicializar e exportar o cliente Supabase
 * para ser usado em toda a aplicação. A configuração é feita de forma segura
 * usando Variáveis de Ambiente.
 */

import { createClient } from '@supabase/supabase-js'

// --- Obtenção das Variáveis de Ambiente ---

// Busca a URL do projeto Supabase.
// NOTA: Usamos `import.meta.env` porque este projeto é construído com Vite.
// O Vite expõe as variáveis de ambiente do frontend através do objeto `import.meta.env`.
// Além disso, por uma regra de segurança do Vite, o nome da variável no arquivo .env
// PRECISA começar com o prefixo `VITE_`.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL

// Busca a chave pública (anon key) do projeto Supabase.
// A mesma regra do Vite se aplica aqui: o nome deve começar com `VITE_` no arquivo .env
// e ser acessado via `import.meta.env`.
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// --- Inicialização do Cliente ---

// Cria uma única instância do cliente Supabase usando a URL e a chave.
// Esta instância ("singleton") será exportada e reutilizada em toda a aplicação,
// evitando criar múltiplas conexões desnecessárias.
export const supabase = createClient(supabaseUrl, supabaseKey)

/**
 * Lembrete de boas práticas:
 * 1. As variáveis de ambiente para desenvolvimento local ficam no arquivo `.env` na raiz do projeto.
 * 2. O arquivo `.env` DEVE estar listado no `.gitignore` para nunca ser enviado para o repositório.
 * 3. Em produção (no Netlify), essas mesmas variáveis devem ser configuradas no painel do site.
 */
