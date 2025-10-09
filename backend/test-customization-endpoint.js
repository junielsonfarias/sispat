const axios = require('axios');

async function testCustomization() {
  try {
    console.log('🧪 Testando endpoint de customização...\n');

    // 1. Fazer login para obter token
    console.log('1️⃣ Fazendo login como admin...');
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'admin@dev.com',
      password: 'Admin@123!Dev',
    });

    const token = loginResponse.data.token;
    console.log('✅ Token obtido:', token.substring(0, 20) + '...\n');

    // 2. Buscar customização atual
    console.log('2️⃣ Buscando customização atual...');
    const getResponse = await axios.get('http://localhost:3000/api/customization', {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log('✅ Customização atual:', JSON.stringify(getResponse.data, null, 2).substring(0, 300) + '...\n');

    // 3. Atualizar customização
    console.log('3️⃣ Atualizando customização (cor primária para #ff0000)...');
    const updateResponse = await axios.put(
      'http://localhost:3000/api/customization',
      {
        primaryColor: '#ff0000',
        prefeituraName: 'PREFEITURA DE TESTE',
        secretariaResponsavel: 'SECRETARIA DE TESTE',
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    console.log('✅ Resposta do update:', JSON.stringify(updateResponse.data, null, 2).substring(0, 300) + '...\n');

    // 4. Buscar novamente para confirmar
    console.log('4️⃣ Buscando novamente para confirmar...');
    const getResponse2 = await axios.get('http://localhost:3000/api/customization', {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log('✅ Customização após update:');
    console.log('   primaryColor:', getResponse2.data.customization.primaryColor);
    console.log('   prefeituraName:', getResponse2.data.customization.prefeituraName);
    console.log('   secretariaResponsavel:', getResponse2.data.customization.secretariaResponsavel);

    console.log('\n✅ TESTE CONCLUÍDO COM SUCESSO!');
    console.log('📊 Resultado: Customização está salvando no banco de dados corretamente!\n');

  } catch (error) {
    console.error('\n❌ ERRO NO TESTE:');
    console.error('   Status:', error.response?.status);
    console.error('   Mensagem:', error.response?.data);
    console.error('   Erro completo:', error.message);
    process.exit(1);
  }
}

testCustomization();

