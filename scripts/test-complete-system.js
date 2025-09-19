#!/usr/bin/env node

import http from 'http';

console.log('🧪 Testando Sistema Completo SISPAT...\n');

// Função para fazer requisição HTTP
function makeRequest(url, method = 'GET') {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: url,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SISPAT-Test-Suite',
      },
    };

    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });

    req.on('error', error => {
      reject(error);
    });

    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

// Função para testar frontend
function testFrontend() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 8080,
      path: '/',
      method: 'GET',
    };

    const req = http.request(options, res => {
      resolve({
        statusCode: res.statusCode,
        headers: res.headers,
      });
    });

    req.on('error', error => {
      reject(error);
    });

    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Frontend request timeout'));
    });

    req.end();
  });
}

async function runTests() {
  const results = {
    backend: {},
    frontend: {},
    apis: {},
    overall: 'PASS',
  };

  console.log('🔍 Testando Backend...');

  try {
    // Teste 1: Health Check
    console.log('  📊 Testando Health Check...');
    const healthResponse = await makeRequest('/api/health');
    results.backend.health = {
      status: healthResponse.statusCode === 200 ? 'PASS' : 'FAIL',
      statusCode: healthResponse.statusCode,
      response: JSON.parse(healthResponse.body),
    };
    console.log(
      `    ✅ Health Check: ${healthResponse.statusCode === 200 ? 'OK' : 'FAIL'}`
    );
  } catch (error) {
    results.backend.health = { status: 'FAIL', error: error.message };
    console.log(`    ❌ Health Check: ${error.message}`);
  }

  try {
    // Teste 2: Sync Public Data
    console.log('  🔄 Testando Sync Public Data...');
    const syncResponse = await makeRequest('/api/sync/public-data');
    results.apis.sync = {
      status: syncResponse.statusCode === 200 ? 'PASS' : 'FAIL',
      statusCode: syncResponse.statusCode,
      response: JSON.parse(syncResponse.body),
    };
    console.log(
      `    ✅ Sync Public Data: ${syncResponse.statusCode === 200 ? 'OK' : 'FAIL'}`
    );
  } catch (error) {
    results.apis.sync = { status: 'FAIL', error: error.message };
    console.log(`    ❌ Sync Public Data: ${error.message}`);
  }

  try {
    // Teste 3: Municipalities Public
    console.log('  🏛️ Testando Municipalities Public...');
    const municipalitiesResponse = await makeRequest(
      '/api/municipalities/public'
    );
    results.apis.municipalities = {
      status: municipalitiesResponse.statusCode === 200 ? 'PASS' : 'FAIL',
      statusCode: municipalitiesResponse.statusCode,
      response: JSON.parse(municipalitiesResponse.body),
    };
    console.log(
      `    ✅ Municipalities Public: ${municipalitiesResponse.statusCode === 200 ? 'OK' : 'FAIL'}`
    );
  } catch (error) {
    results.apis.municipalities = { status: 'FAIL', error: error.message };
    console.log(`    ❌ Municipalities Public: ${error.message}`);
  }

  try {
    // Teste 4: Ensure Superuser
    console.log('  👤 Testando Ensure Superuser...');
    const superuserResponse = await makeRequest(
      '/api/auth/ensure-superuser',
      'POST'
    );
    results.apis.superuser = {
      status: superuserResponse.statusCode === 200 ? 'PASS' : 'FAIL',
      statusCode: superuserResponse.statusCode,
      response: JSON.parse(superuserResponse.body),
    };
    console.log(
      `    ✅ Ensure Superuser: ${superuserResponse.statusCode === 200 ? 'OK' : 'FAIL'}`
    );
  } catch (error) {
    results.apis.superuser = { status: 'FAIL', error: error.message };
    console.log(`    ❌ Ensure Superuser: ${error.message}`);
  }

  console.log('\n🌐 Testando Frontend...');

  try {
    // Teste 5: Frontend
    console.log('  🎨 Testando Frontend...');
    const frontendResponse = await testFrontend();
    results.frontend.main = {
      status: frontendResponse.statusCode === 200 ? 'PASS' : 'FAIL',
      statusCode: frontendResponse.statusCode,
    };
    console.log(
      `    ✅ Frontend: ${frontendResponse.statusCode === 200 ? 'OK' : 'FAIL'}`
    );
  } catch (error) {
    results.frontend.main = { status: 'FAIL', error: error.message };
    console.log(`    ❌ Frontend: ${error.message}`);
  }

  // Verificar se algum teste falhou
  const allTests = [
    results.backend.health,
    results.apis.sync,
    results.apis.municipalities,
    results.apis.superuser,
    results.frontend.main,
  ];

  const failedTests = allTests.filter(test => test && test.status === 'FAIL');
  if (failedTests.length > 0) {
    results.overall = 'FAIL';
  }

  return results;
}

// Executar testes
runTests()
  .then(results => {
    console.log('\n📊 RESULTADOS DOS TESTES:');
    console.log('========================');

    console.log('\n🔧 Backend:');
    console.log(
      `  Health Check: ${results.backend.health?.status || 'NOT_TESTED'}`
    );

    console.log('\n🌐 Frontend:');
    console.log(
      `  Main Page: ${results.frontend.main?.status || 'NOT_TESTED'}`
    );

    console.log('\n🔌 APIs:');
    console.log(
      `  Sync Public Data: ${results.apis.sync?.status || 'NOT_TESTED'}`
    );
    console.log(
      `  Municipalities Public: ${results.apis.municipalities?.status || 'NOT_TESTED'}`
    );
    console.log(
      `  Ensure Superuser: ${results.apis.superuser?.status || 'NOT_TESTED'}`
    );

    console.log('\n🎯 RESULTADO GERAL:');
    console.log(
      `  Status: ${results.overall === 'PASS' ? '✅ TODOS OS TESTES PASSARAM' : '❌ ALGUNS TESTES FALHARAM'}`
    );

    if (results.overall === 'PASS') {
      console.log('\n🎉 Sistema SISPAT está funcionando perfeitamente!');
      console.log('📋 Próximos passos:');
      console.log('  1. Acesse: http://localhost:8080 (Frontend)');
      console.log('  2. Acesse: http://localhost:3001/api/health (Backend)');
      console.log('  3. Para produção: Execute os scripts criados');
    } else {
      console.log('\n⚠️ Alguns testes falharam. Verifique os logs acima.');
    }

    process.exit(results.overall === 'PASS' ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Erro durante os testes:', error);
    process.exit(1);
  });
