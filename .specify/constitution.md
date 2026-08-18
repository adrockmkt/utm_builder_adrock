# Constituição do Projeto

## Princípios

### 1. Governança antes de volume

O produto não deve incentivar geração solta de links. Toda evolução deve melhorar consistência, rastreabilidade e leitura posterior no GA4.

### 2. Single-tenant por instalação

Cada instalação atende um cliente por vez. Customizações podem existir por cliente, mas sem misturar tenants em um mesmo banco na primeira fase.

### 3. Compatibilidade operacional com GA4

A experiência pode ser opinativa, mas a saída precisa preservar leitura clara e sustentável no GA4.

### 4. Admin como fonte de controle

Usuários, perfis, campanhas e grupos de ações devem poder ser governados por um administrador da instalação.

### 5. Arquitetura separável

Toda nova camada deve ser criada de forma destacável do hub principal, evitando acoplamento técnico e conceitual desnecessário.

### 6. AWS-ready desde o início

O projeto deve nascer com premissas de implantação simples em AWS, priorizando stack enxuta e previsível para cliente single-tenant.
