<?php
/**
 * API Backend para integração com Umbrela (Liberpay)
 * Protege as credenciais da API no servidor
 * 
 * EXEMPLO DE USO:
 * 
 * POST /api/payment/pix.php?acao=criar
 * {
 *   "nome": "João da Silva",
 *   "email": "joao@email.com",
 *   "telefone": "11999999999",
 *   "cpf": "12345678900",
 *   "valor": 29.90,
 *   "produto": "Virginia Fonseca - Privacy",
 *   "endereco": {
 *     "rua": "Rua Exemplo",
 *     "numero": "123",
 *     "complemento": "Apto 101",
 *     "cep": "01000-000",
 *     "bairro": "Centro",
 *     "cidade": "São Paulo",
 *     "estado": "SP"
 *   },
 *   "orderBumps": [
 *     {
 *       "name": "Mc Mirella",
 *       "price": "R$ 16,90"
 *     },
 *     {
 *       "name": "Mel Maia",
 *       "price": "R$ 14,90"
 *     }
 *   ]
 * }
 * 
 * A API irá:
 * 1. Somar o valor base + order bumps (29.90 + 16.90 + 14.90 = 61.70)
 * 2. Criar items individuais na transação para cada criadora
 * 3. Enviar tudo para a Umbrela com o valor total correto
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Configurações da API Umbrela
define('UMBRELA_API_KEY', '84f2022f-a84b-4d63-a727-1780e6261fe8');
define('UMBRELA_API_URL', 'https://api-gateway.umbrellapag.com/api');
define('UMBRELA_USER_AGENT', 'UMBRELLAB2B/1.0');

// Função para fazer requisições à API Umbrela
function chamadaUmbrela($endpoint, $metodo = 'GET', $dados = null) {
    $url = UMBRELA_API_URL . $endpoint;
    
    $headers = [
        'x-api-key: ' . UMBRELA_API_KEY,
        'User-Agent: ' . UMBRELA_USER_AGENT,
        'Content-Type: application/json'
    ];
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    
    if ($metodo === 'POST') {
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($dados));
    }
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    
    if (curl_errno($ch)) {
        $error = curl_error($ch);
        curl_close($ch);
        return [
            'success' => false,
            'error' => 'Erro na requisição: ' . $error
        ];
    }
    
    curl_close($ch);
    
    $resultado = json_decode($response, true);
    
    return [
        'success' => ($httpCode >= 200 && $httpCode < 300),
        'httpCode' => $httpCode,
        'data' => $resultado
    ];
}

// Validar CPF
function validarCPF($cpf) {
    $cpf = preg_replace('/[^0-9]/', '', $cpf);
    
    if (strlen($cpf) != 11) {
        return false;
    }
    
    // Verifica se todos os dígitos são iguais
    if (preg_match('/(\d)\1{10}/', $cpf)) {
        return false;
    }
    
    return true;
}

// Roteamento
$metodo = $_SERVER['REQUEST_METHOD'];
$acao = $_GET['acao'] ?? '';

// ============================================================================
// CRIAR TRANSAÇÃO PIX
// ============================================================================
if ($acao === 'criar' && $metodo === 'POST') {
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Validar dados obrigatórios
    $camposObrigatorios = ['nome', 'email', 'telefone', 'cpf', 'valor'];
    foreach ($camposObrigatorios as $campo) {
        if (empty($input[$campo])) {
            echo json_encode([
                'success' => false,
                'error' => "Campo obrigatório ausente: {$campo}"
            ]);
            exit;
        }
    }
    
    // Validar CPF
    if (!validarCPF($input['cpf'])) {
        echo json_encode([
            'success' => false,
            'error' => 'CPF inválido'
        ]);
        exit;
    }
    
    // Validar email
    if (!filter_var($input['email'], FILTER_VALIDATE_EMAIL)) {
        echo json_encode([
            'success' => false,
            'error' => 'Email inválido'
        ]);
        exit;
    }
    
    // Validar valor do plano base
    $valorPlano = floatval($input['valor']);
    if ($valorPlano <= 0) {
        echo json_encode([
            'success' => false,
            'error' => 'Valor do plano inválido'
        ]);
        exit;
    }
    
    // Processar order bumps se existirem
    $orderBumps = isset($input['orderBumps']) && is_array($input['orderBumps']) ? $input['orderBumps'] : [];
    $valorTotalBumps = 0;
    
    // Somar valores dos order bumps
    foreach ($orderBumps as $bump) {
        if (isset($bump['price'])) {
            // Remove R$, espaços e converte vírgula para ponto
            $preco = str_replace(['R$', ' ', ','], ['', '', '.'], $bump['price']);
            $valorTotalBumps += floatval($preco);
        }
    }
    
    // Valor total = plano + order bumps
    $valorTotal = $valorPlano + $valorTotalBumps;
    
    // Converter valor total para centavos
    $valorEmCentavos = round($valorTotal * 100);
    
    // Converter valor do plano para centavos
    $valorPlanoEmCentavos = round($valorPlano * 100);
    
    // Limpar dados
    $cpf = preg_replace('/[^0-9]/', '', $input['cpf']);
    $telefone = preg_replace('/[^0-9]/', '', $input['telefone']);
    
    // Processar endereço (com valores padrão se vazio)
    $rua = !empty($input['endereco']['rua']) ? $input['endereco']['rua'] : 'Rua não informada';
    $numero = !empty($input['endereco']['numero']) ? $input['endereco']['numero'] : 'S/N';
    $complemento = $input['endereco']['complemento'] ?? '';
    $cep = !empty($input['endereco']['cep']) ? preg_replace('/[^0-9]/', '', $input['endereco']['cep']) : '00000000';
    $bairro = !empty($input['endereco']['bairro']) ? $input['endereco']['bairro'] : 'Centro';
    $cidade = !empty($input['endereco']['cidade']) ? $input['endereco']['cidade'] : 'São Paulo';
    
    // Validar e limpar estado (deve ter exatamente 2 letras)
    $estado = strtoupper($input['endereco']['estado'] ?? '');
    $estado = preg_replace('/[^A-Z]/', '', $estado); // Remove tudo que não for letra
    if (strlen($estado) != 2) {
        $estado = 'SP'; // Valor padrão se inválido
    }
    
    // Preparar dados para API Umbrela
    $dadosTransacao = [
        'amount' => $valorEmCentavos,
        'currency' => 'BRL',
        'paymentMethod' => 'PIX',
        'customer' => [
            'name' => $input['nome'],
            'email' => $input['email'],
            'document' => [
                'number' => $cpf,
                'type' => 'CPF'
            ],
            'phone' => $telefone,
            'externalRef' => '',
            'address' => [
                'street' => $rua,
                'streetNumber' => $numero,
                'complement' => $complemento,
                'zipCode' => $cep,
                'neighborhood' => $bairro,
                'city' => $cidade,
                'state' => $estado,
                'country' => 'br'
            ]
        ],
        'shipping' => [
            'fee' => 0,
            'address' => [
                'street' => $rua,
                'streetNumber' => $numero,
                'complement' => $complemento,
                'zipCode' => $cep,
                'neighborhood' => $bairro,
                'city' => $cidade,
                'state' => $estado,
                'country' => 'br'
            ]
        ],
        'items' => array_merge(
            [
                [
                    'title' => $input['produto'] ?? 'Virginia Fonseca - Privacy',
                    'unitPrice' => $valorPlanoEmCentavos,
                    'quantity' => 1,
                    'tangible' => true,
                    'externalRef' => 'plan_base'
                ]
            ],
            // Adicionar items dos order bumps
            array_map(function($bump) {
                $preco = str_replace(['R$', ' ', ','], ['', '', '.'], $bump['price']);
                $precoEmCentavos = round(floatval($preco) * 100);
                return [
                    'title' => $bump['name'] . ' - Privacy (Order Bump)',
                    'unitPrice' => $precoEmCentavos,
                    'quantity' => 1,
                    'tangible' => true,
                    'externalRef' => 'order_bump_' . strtolower(str_replace(' ', '_', $bump['name']))
                ];
            }, $orderBumps)
        ),
        'pix' => [
            'expiresInDays' => 1
        ],
        'postbackUrl' => '',
        'metadata' => json_encode([
            'source' => 'checkout_virginia',
            'timestamp' => date('Y-m-d H:i:s'),
            'plan_value' => $valorPlano,
            'order_bumps_value' => $valorTotalBumps,
            'total_value' => $valorTotal,
            'order_bumps_count' => count($orderBumps),
            'order_bumps_names' => array_column($orderBumps, 'name')
        ]),
        'traceable' => true,
        'ip' => $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0'
    ];
    
    // Fazer requisição à API Umbrela
    $resultado = chamadaUmbrela('/user/transactions', 'POST', $dadosTransacao);
    
    if ($resultado['success'] && isset($resultado['data']['status']) && $resultado['data']['status'] === 200) {
        echo json_encode([
            'success' => true,
            'data' => [
                'id' => $resultado['data']['data']['id'],
                'qrCode' => $resultado['data']['data']['qrCode'],
                'status' => $resultado['data']['data']['status'],
                'amount' => $resultado['data']['data']['amount'],
                'expirationDate' => $resultado['data']['data']['pix']['expirationDate'] ?? null,
                'breakdown' => [
                    'plan_value' => $valorPlano,
                    'order_bumps_value' => $valorTotalBumps,
                    'total_value' => $valorTotal,
                    'order_bumps_count' => count($orderBumps)
                ]
            ]
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'error' => $resultado['data']['message'] ?? 'Erro ao criar transação',
            'details' => $resultado['data'] ?? null
        ]);
    }
    
    exit;
}

// ============================================================================
// VERIFICAR STATUS DO PAGAMENTO
// ============================================================================
if ($acao === 'verificar' && $metodo === 'GET') {
    
    $transactionId = $_GET['id'] ?? '';
    
    if (empty($transactionId)) {
        echo json_encode([
            'success' => false,
            'error' => 'ID da transação não fornecido'
        ]);
        exit;
    }
    
    // Fazer requisição à API Umbrela
    $resultado = chamadaUmbrela('/user/transactions/' . $transactionId, 'GET');
    
    if ($resultado['success'] && isset($resultado['data']['status']) && $resultado['data']['status'] === 200) {
        echo json_encode([
            'success' => true,
            'data' => [
                'id' => $resultado['data']['data']['id'],
                'status' => $resultado['data']['data']['status'],
                'amount' => $resultado['data']['data']['amount'],
                'paymentMethod' => $resultado['data']['data']['paymentMethod'],
                'paidAt' => $resultado['data']['data']['paidAt'] ?? null,
                'pago' => $resultado['data']['data']['status'] === 'PAID'
            ]
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'error' => $resultado['data']['message'] ?? 'Erro ao verificar transação',
            'details' => $resultado['data'] ?? null
        ]);
    }
    
    exit;
}

// ============================================================================
// ROTA INVÁLIDA
// ============================================================================
echo json_encode([
    'success' => false,
    'error' => 'Ação inválida ou método não permitido',
    'info' => [
        'acoes_disponiveis' => [
            'criar' => 'POST /api/payment/pix.php?acao=criar',
            'verificar' => 'GET /api/payment/pix.php?acao=verificar&id={transactionId}'
        ]
    ]
]);
