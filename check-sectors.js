const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'sispat',
  user: 'postgres',
  password: 'postgres',
});

async function checkSectors() {
  try {
    console.log('🔍 Verificando setores no banco de dados...');

    // Verificar setores
    const sectorsResult = await pool.query(
      'SELECT id, name, municipality_id FROM sectors ORDER BY name'
    );
    console.log(
      `\n📋 Total de setores encontrados: ${sectorsResult.rows.length}`
    );

    if (sectorsResult.rows.length > 0) {
      console.log('\n📝 Setores:');
      sectorsResult.rows.forEach((row, index) => {
        console.log(
          `${index + 1}. ${row.name} (ID: ${row.id}, Município: ${row.municipality_id})`
        );
      });
    } else {
      console.log('❌ Nenhum setor encontrado no banco de dados');
    }

    // Verificar municípios
    const municipalitiesResult = await pool.query(
      'SELECT id, name FROM municipalities ORDER BY name'
    );
    console.log(
      `\n🏛️ Total de municípios encontrados: ${municipalitiesResult.rows.length}`
    );

    if (municipalitiesResult.rows.length > 0) {
      console.log('\n📝 Municípios:');
      municipalitiesResult.rows.forEach((row, index) => {
        console.log(`${index + 1}. ${row.name} (ID: ${row.id})`);
      });
    }
  } catch (error) {
    console.error('❌ Erro ao verificar setores:', error.message);
  } finally {
    await pool.end();
  }
}

checkSectors();
