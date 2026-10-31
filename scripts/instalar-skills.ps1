# Instala as skills públicas usadas no UFC Flow para o Claude Code.
# Rode na raiz do repositório: powershell -ExecutionPolicy Bypass -File scripts/instalar-skills.ps1
# As skills vão para .claude/skills/ (cópias, sem symlink) e ficam registradas em skills-lock.json.
$ErrorActionPreference = 'Stop'

$fontes = @(
  # React/Next (Vercel): desempenho, composição de componentes e revisão de UI
  @('vercel-labs/agent-skills', '--skill', 'vercel-react-best-practices', '--skill', 'vercel-composition-patterns', '--skill', 'web-design-guidelines'),
  # shadcn/ui (oficial)
  @('shadcn/ui'),
  # Turborepo (oficial)
  @('vercel/turborepo'),
  # Migração ESLint -> oxlint (oficial do projeto oxc)
  @('https://github.com/oxc-project/oxc', '--skill', 'migrate-oxlint')
)

foreach ($fonte in $fontes) {
  $argumentos = $fonte + @('-a', 'claude-code', '--copy', '-y')
  Write-Host "`n> npx skills add $($argumentos -join ' ')" -ForegroundColor Cyan
  & npx --yes skills add @argumentos
  if ($LASTEXITCODE -ne 0) { throw "Falhou ao instalar: $($fonte -join ' ')" }
}

Write-Host "`nSkills do projeto:" -ForegroundColor Green
& npx --yes skills list
