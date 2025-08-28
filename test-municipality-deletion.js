import fetch from 'node-fetch';

async function testMunicipalityDeletion() {
  const baseUrl = 'http://localhost:3001/api';
  
  try {
    // Primeiro, fazer login para obter o token
    console.log('🔐 Fazendo login...');
    const loginResponse = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'junielsonfarias@gmail.com',
        password: 'admin123'
      })
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }

    const loginData = await loginResponse.json();
    const token = loginData.token;

    console.log('✅ Login realizado com sucesso');

    // Buscar municípios
    console.log('📋 Buscando municípios...');
    const municipalitiesResponse = await fetch(`${baseUrl}/municipalities`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!municipalitiesResponse.ok) {
      throw new Error(`Failed to fetch municipalities: ${municipalitiesResponse.status}`);
    }

    const municipalities = await municipalitiesResponse.json();
    console.log(`📊 Encontrados ${municipalities.length} municípios`);

    if (municipalities.length === 0) {
      console.log('❌ Nenhum município encontrado para testar');
      return;
    }

    // Pegar o primeiro município para teste
    const testMunicipality = municipalities[0];
    console.log(`🧪 Testando exclusão do município: ${testMunicipality.name} (${testMunicipality.id})`);

    // Tentar exclusão normal primeiro
    console.log('🔄 Tentando exclusão normal...');
    const deleteResponse = await fetch(`${baseUrl}/municipalities/${testMunicipality.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log(`📡 Resposta da exclusão normal: ${deleteResponse.status}`);
    
    if (deleteResponse.status === 400) {
      const errorData = await deleteResponse.json();
      console.log('⚠️ Exclusão normal falhou (esperado se há dependências):', errorData);
      
      // Tentar exclusão forçada
      console.log('🔨 Tentando exclusão forçada...');
      const forceDeleteResponse = await fetch(`${baseUrl}/municipalities/${testMunicipality.id}?force=true`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log(`📡 Resposta da exclusão forçada: ${forceDeleteResponse.status}`);
      
      if (forceDeleteResponse.ok) {
        const successData = await forceDeleteResponse.json();
        console.log('✅ Exclusão forçada realizada com sucesso:', successData);
      } else {
        const errorData = await forceDeleteResponse.json();
        console.log('❌ Exclusão forçada falhou:', errorData);
      }
    } else if (deleteResponse.ok) {
      const successData = await deleteResponse.json();
      console.log('✅ Exclusão normal realizada com sucesso:', successData);
    } else {
      const errorData = await deleteResponse.json();
      console.log('❌ Exclusão falhou:', errorData);
    }

  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
}

testMunicipalityDeletion();
