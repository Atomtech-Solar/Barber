# PRD — Plataforma SaaS Multi-Tenant para Barbearias e Manicures

## 1. Visão Geral do Produto

### Nome do Projeto

**(Definir futuramente)** — Plataforma SaaS white-label para gestão completa de barbearias, salões e serviços de manicure.

### Objetivo

Criar uma plataforma **multi-empresa (multi-tenant)** onde cada negócio possui:

* Dashboard administrativa própria
* Landing page automática personalizada
* Sistema inteligente de agendamentos
* Gestão operacional centralizada

O sistema deve permitir escalabilidade, automação e padronização operacional para pequenos negócios de serviços pessoais.

---

## 2. Estrutura Hierárquica do Sistema

### 2.1 Dono da Plataforma (Super Admin)

Nível máximo de acesso.

**Responsabilidades:**

* Criar, editar e remover empresas
* Visualizar métricas globais
* Monitorar uso da plataforma
* Controlar planos futuramente
* Acessar dados operacionais (sem editar dados internos do cliente)

**Visões exclusivas:**

* Dashboard global
* Lista de empresas
* Analytics gerais
* Controle de módulos ativos

---

### 2.2 Empresas (Tenants)

Cada empresa é independente dentro do sistema.

Cada empresa possui:

* Dashboard própria
* Funcionários próprios
* Serviços próprios
* Agenda própria
* Landing page própria

Isolamento obrigatório entre empresas.

---

### 2.3 Funcionários

Exemplos:

* Barbeiros
* Manicures
* Profissionais de serviço

Permissões:

* Visualizar agenda
* Gerenciar horários próprios
* Visualizar clientes agendados

---

### 2.4 Clientes

Usuários finais que realizam agendamentos.

Devem obrigatoriamente criar conta para agendar.

Cadastro inclui:

* Nome
* Email
* Telefone
* Senha

---

## 3. Arquitetura Conceitual (SEM BANCO DEFINIDO)

⚠️ O sistema **NÃO deve implementar banco de dados**.
Todas as persistências devem ser simuladas via:

* mocks
* estados locais
* serviços fake
* interfaces abstratas

Objetivo: permitir posterior conexão manual ao backend.

---

## 4. Dashboard da Empresa

### 4.1 Página Inicial (Dashboard)

Exibir:

* Agendamentos do dia
* Próximos atendimentos
* Profissionais ativos
* Horários ocupados vs livres
* Indicadores rápidos:

  * atendimentos hoje
  * serviços mais vendidos
  * taxa de ocupação

Ações rápidas:

* Criar agendamento manual
* Bloquear horário
* Adicionar cliente

---

### 4.2 Gestão de Serviços

Empresa pode:

* Criar serviços
* Editar serviços
* Definir:

  * nome
  * duração (minutos)
  * preço
  * categoria

Exemplo:

* Corte → 30 min
* Barba → 30 min
* Corte + Barba → 60 min

---

### 4.3 Gestão de Funcionários

Cadastrar profissionais:

Campos:

* Nome
* Foto
* Especialidade
* Serviços que realiza
* Horário de trabalho

Funções:

* ativar/desativar profissional
* definir agenda semanal

---

### 4.4 Agenda Inteligente

Sistema central do produto.

#### Fluxo:

1. Cliente escolhe serviço(s)
2. Sistema soma duração total
3. Cliente escolhe profissional
4. Sistema calcula horários disponíveis
5. Horários incompatíveis desaparecem automaticamente

#### Regras:

* Horário selecionado bloqueia o intervalo completo
* Não permitir sobreposição
* Bloqueio imediato visual (soft lock)
* Atualização dinâmica dos horários

---

### 4.5 Clientes

Empresa pode:

* Visualizar clientes cadastrados
* Histórico de agendamentos
* Contato rápido

---

## 5. Landing Page Automática da Empresa

Cada empresa recebe uma página pública automática.

### Estrutura:

#### 5.1 Hero Section

* Nome da empresa
* Logo
* Slogan
* Botão “Agendar Agora”

#### 5.2 Serviços

Lista dinâmica dos serviços cadastrados.

#### 5.3 Profissionais

Cards com:

* foto
* nome
* especialidade

#### 5.4 Como Funciona

Explicação simples do agendamento.

#### 5.5 Botão de Agendamento

Redireciona para fluxo autenticado.

---

## 6. Fluxo de Agendamento (Cliente)

### 6.1 Autenticação Obrigatória

Se não estiver logado:
→ cadastro/login obrigatório.

---

### 6.2 Seleção de Serviços

Cliente pode selecionar múltiplos serviços.

Sistema calcula:

```
tempo_total = soma(duração_serviços)
```

---

### 6.3 Escolha do Profissional

Mostrar apenas profissionais compatíveis.

---

### 6.4 Horários Disponíveis

Sistema exibe apenas horários que:

* cabem dentro do tempo total
* não conflitam com outros agendamentos
* respeitam horário de trabalho

Horários ocupados:

* ocultos ou bloqueados visualmente

---

### 6.5 Confirmação

Resumo:

* serviços
* profissional
* duração
* horário
* empresa

Botão:
✅ Confirmar agendamento

---

## 7. Regras de Negócio Principais

1. Empresas não compartilham dados.
2. Agendamentos nunca podem sobrepor.
3. Duração define disponibilidade.
4. Cliente precisa conta para agendar.
5. Landing page sempre vinculada à empresa.
6. Dashboard isolada por tenant.
7. Dono da plataforma possui visão global.

---

## 8. Experiência do Usuário (UX)

### Princípios:

* fluxo em passos curtos
* poucas decisões por tela
* mobile-first
* agendamento em menos de 30 segundos

---

## 9. Escalabilidade Futura (Não implementar agora)

Planejado para:

* pagamentos online
* planos SaaS
* notificações WhatsApp
* IA para previsão de horários
* programa de fidelidade
* relatórios financeiros

---

## 10. Métricas de Sucesso

* Tempo médio de agendamento < 30s
* Taxa de conclusão > 80%
* Ocupação da agenda crescente
* Retorno recorrente de clientes

---

## 11. Fora do Escopo (Atual)

❌ Banco de dados real
❌ Integração de pagamento
❌ Notificações externas
❌ Sistema financeiro completo

---

## 12. Resultado Esperado

Uma base funcional completa do produto SaaS contendo:

* Estrutura multi-tenant
* Dashboard empresarial
* Landing pages automáticas
* Sistema inteligente de agendamento
* Hierarquia clara de usuários

Preparado para futura conexão com backend real.

---
