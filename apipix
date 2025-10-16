═══════════════════════════════════════════════════════════════════════════════
                    📘 DOCUMENTAÇÃO API UMBRELA (LIBERPAY)
═══════════════════════════════════════════════════════════════════════════════

🔑 CREDENCIAIS
═══════════════════════════════════════════════════════════════════════════════
API Key: 84f2022f-a84b-4d63-a727-1780e6261fe8
Base URL: https://api-gateway.umbrellapag.com/api
User-Agent: UMBRELLAB2B/1.0


═══════════════════════════════════════════════════════════════════════════════
📤 1. CRIAR TRANSAÇÃO PIX
═══════════════════════════════════════════════════════════════════════════════

Endpoint: POST /user/transactions

Headers:
{
  "x-api-key": "84f2022f-a84b-4d63-a727-1780e6261fe8",
  "User-Agent": "UMBRELLAB2B/1.0",
  "Content-Type": "application/json"
}

Body (Exemplo):
{
  "amount": 7920,
  "currency": "BRL",
  "paymentMethod": "PIX",
  "customer": {
    "name": "João da Silva",
    "email": "joao@email.com",
    "document": {
      "number": "12345678900",
      "type": "CPF"
    },
    "phone": "11999999999",
    "externalRef": "",
    "address": {
      "street": "Rua Exemplo",
      "streetNumber": "123",
      "complement": "Apto 101",
      "zipCode": "01000000",
      "neighborhood": "Centro",
      "city": "São Paulo",
      "state": "SP",
      "country": "br"
    }
  },
  "shipping": {
    "fee": 0,
    "address": {
      "street": "Rua Exemplo",
      "streetNumber": "123",
      "complement": "Apto 101",
      "zipCode": "01000000",
      "neighborhood": "Centro",
      "city": "São Paulo",
      "state": "SP",
      "country": "br"
    }
  },
  "items": [{
    "title": "Produto XYZ",
    "unitPrice": 7920,
    "quantity": 1,
    "tangible": true,
    "externalRef": ""
  }],
  "pix": {
    "expiresInDays": 1
  },
  "postbackUrl": "",
  "metadata": "",
  "traceable": true,
  "ip": "0.0.0.0"
}

Resposta de Sucesso:
{
  "status": 200,
  "message": "Transação criada com sucesso.",
  "data": {
    "id": "uuid-da-transacao",
    "amount": 7920,
    "paymentMethod": "PIX",
    "status": "WAITING_PAYMENT",
    "qrCode": "00020126580014br.gov.bcb.pix...",
    "pix": {
      "expirationDate": "2025-04-23T00:00:00.000Z"
    },
    "customer": { ... },
    "items": [ ... ]
  }
}


═══════════════════════════════════════════════════════════════════════════════
🔍 2. VERIFICAR STATUS DO PAGAMENTO
═══════════════════════════════════════════════════════════════════════════════

Endpoint: GET /user/transactions/{transactionId}

Headers:
{
  "x-api-key": "84f2022f-a84b-4d63-a727-1780e6261fe8",
  "User-Agent": "UMBRELLAB2B/1.0"
}

Resposta:
{
  "status": 200,
  "message": "Transação encontrada com sucesso.",
  "data": {
    "id": "uuid-da-transacao",
    "amount": 7920,
    "status": "PAID",
    "paymentMethod": "PIX",
    "paidAt": "2025-04-16T15:30:00.000Z",
    "customer": { ... }
  }
}


═══════════════════════════════════════════════════════════════════════════════
📊 3. STATUS POSSÍVEIS
═══════════════════════════════════════════════════════════════════════════════

PROCESSING        → Processando
AUTHORIZED        → Autorizado
PAID              → ✅ Pago (ÚNICO QUE CONFIRMA PAGAMENTO)
WAITING_PAYMENT   → Aguardando pagamento
REFUSED           → Recusado
CANCELED          → Cancelado
REFUNDED          → Reembolsado
CHARGEDBACK       → Chargeback
IN_PROTEST        → Em protesto


═══════════════════════════════════════════════════════════════════════════════
💻 EXEMPLO DE IMPLEMENTAÇÃO (Node.js/Next.js)
═══════════════════════════════════════════════════════════════════════════════

// ============================================================================
// CRIAR TRANSAÇÃO
// ============================================================================

async function criarTransacaoPix(dados) {
  const response = await fetch('https://api-gateway.umbrellapag.com/api/user/transactions', {
    method: 'POST',
    headers: {
      'x-api-key': '84f2022f-a84b-4d63-a727-1780e6261fe8',
      'User-Agent': 'UMBRELLAB2B/1.0',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      amount: dados.valor,
      currency: 'BRL',
      paymentMethod: 'PIX',
      customer: {
        name: dados.nome,
        email: dados.email,
        document: {
          number: dados.cpf,
          type: 'CPF'
        },
        phone: dados.telefone,
        externalRef: '',
        address: dados.endereco
      },
      shipping: {
        fee: 0,
        address: dados.endereco
      },
      items: [{
        title: dados.produto,
        unitPrice: dados.valor,
        quantity: 1,
        tangible: true,
        externalRef: ''
      }],
      pix: {
        expiresInDays: 1
      },
      postbackUrl: '',
      metadata: '',
      traceable: true,
      ip: '0.0.0.0'
    })
  });

  const result = await response.json();
  
  if (result.status === 200) {
    return {
      id: result.data.id,
      qrCode: result.data.qrCode,
      status: result.data.status
    };
  }
  
  throw new Error('Erro ao criar transação');
}


// ============================================================================
// VERIFICAR PAGAMENTO
// ============================================================================

async function verificarPagamento(transactionId) {
  const response = await fetch(
    `https://api-gateway.umbrellapag.com/api/user/transactions/${transactionId}`,
    {
      method: 'GET',
      headers: {
        'x-api-key': '84f2022f-a84b-4d63-a727-1780e6261fe8',
        'User-Agent': 'UMBRELLAB2B/1.0'
      }
    }
  );

  const result = await response.json();
  
  return {
    status: result.data.status,
    pago: result.data.status === 'PAID'
  };
}


// ============================================================================
// POLLING PARA VERIFICAR PAGAMENTO
// ============================================================================

function iniciarVerificacao(transactionId, callback) {
  const interval = setInterval(async () => {
    try {
      const resultado = await verificarPagamento(transactionId);
      
      if (resultado.pago) {
        clearInterval(interval);
        callback('PAGO');
      }
    } catch (error) {
      console.error('Erro ao verificar pagamento:', error);
    }
  }, 5000); // Verifica a cada 5 segundos
  
  // Parar após 15 minutos
  setTimeout(() => clearInterval(interval), 15 * 60 * 1000);
  
  return interval;
}


═══════════════════════════════════════════════════════════════════════════════
⚠️ PONTOS IMPORTANTES
═══════════════════════════════════════════════════════════════════════════════

1. CPF OBRIGATÓRIO
   → Sempre envie o CPF do cliente sem formatação (apenas números)

2. ENDEREÇO COMPLETO
   → Todos os campos de endereço são obrigatórios
   → street, streetNumber, zipCode, neighborhood, city, state, country

3. QR CODE
   → Retornado no campo "qrCode" da resposta
   → Use para gerar o QR Code visual

4. EXPIRAÇÃO
   → Configure "expiresInDays" (padrão: 1 dia)
   → Após expirar, o PIX não pode mais ser pago

5. POLLING
   → Verifique o status a cada 5-10 segundos
   → Pare após 15 minutos ou quando status = PAID

6. STATUS PAID
   → ÚNICO status que confirma pagamento
   → Todos os outros são intermediários ou falhas

7. VALOR
   → Sempre em centavos (ex: R$ 79,20 = 7920)


═══════════════════════════════════════════════════════════════════════════════
🔐 SEGURANÇA
═══════════════════════════════════════════════════════════════════════════════

✅ Sempre use HTTPS
✅ Nunca exponha a API Key no frontend
✅ Crie rotas de API no backend para intermediar
✅ Valide todos os dados antes de enviar
✅ Use variáveis de ambiente para a API Key
✅ Implemente rate limiting
✅ Valide CPF antes de enviar


═══════════════════════════════════════════════════════════════════════════════
📝 CAMPOS OPCIONAIS
═══════════════════════════════════════════════════════════════════════════════

- complement (endereço)
- externalRef (customer e items)
- postbackUrl (webhook para notificações)
- metadata (dados extras em string)
- shipping.fee (taxa de entrega)


═══════════════════════════════════════════════════════════════════════════════
🚀 EXEMPLO COMPLETO DE FLUXO
═══════════════════════════════════════════════════════════════════════════════

1. Cliente preenche dados (nome, CPF, telefone, endereço)
2. Frontend envia para sua API backend
3. Backend cria transação na Umbrela
4. Backend retorna QR Code para o frontend
5. Frontend exibe QR Code
6. Backend inicia polling para verificar pagamento
7. Quando status = PAID, notifica o cliente
8. Processa o pedido


═══════════════════════════════════════════════════════════════════════════════
📞 SUPORTE
═══════════════════════════════════════════════════════════════════════════════

Documentação Oficial: https://docs.umbrellapag.com
Email: suporte@umbrellapag.com


═══════════════════════════════════════════════════════════════════════════════
                            FIM DA DOCUMENTAÇÃO
═══════════════════════════════════════════════════════════════════════════════
