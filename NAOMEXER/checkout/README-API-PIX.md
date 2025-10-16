# API PIX - Backend Umbrela (Liberpay)

## 📋 Descrição

Backend PHP que faz a integração segura com a API Umbrela para geração de pagamentos PIX. As credenciais da API ficam protegidas no servidor, sem exposição no frontend.

## 🔒 Segurança

- ✅ API Key da Umbrela **não exposta** no frontend
- ✅ Validação de dados no servidor
- ✅ Validação de CPF
- ✅ Validação de email
- ✅ Proteção CORS configurada

## 🚀 Endpoints Disponíveis

### 1. Criar Transação PIX

**Endpoint:** `POST /api-pix.php?acao=criar`

**Payload:**
```json
{
  "nome": "João da Silva",
  "email": "joao@example.com",
  "telefone": "11999999999",
  "cpf": "123.456.789-00",
  "valor": 29.90,
  "produto": "Virginia - Privacy",
  "endereco": {
    "rua": "Rua Exemplo",
    "numero": "123",
    "complemento": "Apto 45",
    "cep": "01234-567",
    "bairro": "Centro",
    "cidade": "São Paulo",
    "estado": "SP"
  }
}
```

**Resposta de Sucesso:**
```json
{
  "success": true,
  "data": {
    "id": "trans_abc123",
    "qrCode": "00020126580014br.gov.bcb.pix...",
    "status": "PENDING",
    "amount": 2990,
    "expirationDate": "2024-10-17T23:59:59Z"
  }
}
```

**Resposta de Erro:**
```json
{
  "success": false,
  "error": "CPF inválido"
}
```

### 2. Verificar Status do Pagamento

**Endpoint:** `GET /api-pix.php?acao=verificar&id={transactionId}`

**Resposta de Sucesso:**
```json
{
  "success": true,
  "data": {
    "id": "trans_abc123",
    "status": "PAID",
    "amount": 2990,
    "paymentMethod": "PIX",
    "paidAt": "2024-10-16T15:30:00Z",
    "pago": true
  }
}
```

## 📦 Status Possíveis da Transação

| Status | Descrição |
|--------|-----------|
| `PENDING` | Aguardando pagamento |
| `PAID` | Pago com sucesso |
| `REFUSED` | Pagamento recusado |
| `CANCELED` | Pagamento cancelado |
| `EXPIRED` | PIX expirado |

## 🔧 Configuração

### Arquivo: `api-pix.php`

```php
// Configurações da API Umbrela
define('UMBRELA_API_KEY', '84f2022f-a84b-4d63-a727-1780e6261fe8');
define('UMBRELA_API_URL', 'https://api-gateway.umbrellapag.com/api');
define('UMBRELA_USER_AGENT', 'UMBRELLAB2B/1.0');
```

⚠️ **IMPORTANTE:** Altere a API Key para a sua chave de produção quando necessário.

## 💻 Exemplo de Uso no Frontend

```javascript
// Criar transação PIX
async function gerarPix() {
    try {
        const response = await fetch('api-pix.php?acao=criar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nome: 'João da Silva',
                email: 'joao@example.com',
                telefone: '11999999999',
                cpf: '12345678900',
                valor: 29.90,
                produto: 'Virginia - Privacy',
                endereco: {
                    rua: '',
                    numero: '',
                    complemento: '',
                    cep: '',
                    bairro: '',
                    cidade: '',
                    estado: ''
                }
            })
        });

        const result = await response.json();
        
        if (result.success) {
            console.log('PIX gerado:', result.data);
            // Exibir QR Code: result.data.qrCode
            // ID da transação: result.data.id
        } else {
            console.error('Erro:', result.error);
        }
    } catch (error) {
        console.error('Erro na requisição:', error);
    }
}

// Verificar status do pagamento
async function verificarPagamento(transactionId) {
    try {
        const response = await fetch(`api-pix.php?acao=verificar&id=${transactionId}`);
        const result = await response.json();
        
        if (result.success) {
            console.log('Status:', result.data.status);
            console.log('Pago:', result.data.pago);
        }
    } catch (error) {
        console.error('Erro:', error);
    }
}
```

## 🔄 Fluxo Completo

1. **Frontend** envia dados do cliente para `api-pix.php?acao=criar`
2. **Backend** valida os dados (CPF, email, valor)
3. **Backend** faz requisição para API Umbrela (com credenciais seguras)
4. **Backend** retorna QR Code e ID da transação
5. **Frontend** exibe QR Code para o usuário
6. **Frontend** inicia verificação automática a cada 5 segundos
7. **Backend** consulta status na API Umbrela
8. **Backend** retorna status atualizado
9. Quando `pago === true`, redireciona para confirmação

## ⚙️ Requisitos

- PHP 7.0 ou superior
- Extensão cURL habilitada
- Servidor Apache/XAMPP configurado

## 🐛 Debug

Para debugar erros, verifique:

1. Se o cURL está habilitado no PHP
2. Se a API Key está correta
3. Se o servidor pode fazer requisições HTTPS externas
4. Logs de erro do PHP (`error_log`)

## 📞 Suporte

Em caso de erros na API Umbrela, consulte a documentação oficial:
- Documentação: https://docs.umbrellapag.com
- Suporte: contato@umbrellapag.com
