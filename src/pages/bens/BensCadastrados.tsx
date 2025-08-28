import { usePatrimonio } from '@/contexts/PatrimonioContext';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

const BensCadastrados = () => {
  const { patrimonios, isLoading, refreshPatrimonios } = usePatrimonio();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Debug logs
  useEffect(() => {
    console.log('🏠 BensCadastrados - Componente montado');
    console.log(
      '👤 Usuário:',
      user
        ? {
            id: user.id,
            name: user.name,
            role: user.role,
            municipalityId: user.municipalityId,
          }
        : 'Não autenticado'
    );
    console.log(
      '🏠 BensCadastrados - Patrimônios recebidos:',
      patrimonios.length
    );
    console.log(
      '📋 Patrimônios:',
      patrimonios.map(p => ({
        id: p.id,
        numero: p.numero_patrimonio,
        descricao: p.descricao,
        setor: p.setor_responsavel,
        local: p.local_objeto,
      }))
    );

    // Verificar token de autenticação
    const token =
      localStorage.getItem('sispat_auth_token') ||
      sessionStorage.getItem('sispat_auth_token');
    console.log('🔑 Token de autenticação:', token ? 'Presente' : 'Ausente');
  }, [patrimonios, user]);

  // Filtrar patrimônios baseado no termo de busca
  const filteredPatrimonios = useMemo(() => {
    if (!searchTerm) return patrimonios;

    return patrimonios.filter(patrimonio => {
      const search = searchTerm.toLowerCase();
      return (
        patrimonio.numero_patrimonio?.toLowerCase().includes(search) ||
        patrimonio.descricao?.toLowerCase().includes(search) ||
        patrimonio.setor_responsavel?.toLowerCase().includes(search) ||
        patrimonio.local_objeto?.toLowerCase().includes(search)
      );
    });
  }, [patrimonios, searchTerm]);

  // Paginação
  const totalPages = Math.ceil(filteredPatrimonios.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPatrimonios = filteredPatrimonios.slice(startIndex, endIndex);

  const handleRefresh = async () => {
    try {
      await refreshPatrimonios();
    } catch (error) {
      console.error('Erro ao atualizar patrimônios:', error);
    }
  };

  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4'></div>
          <p className='text-gray-600'>Carregando patrimônios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='container mx-auto p-6'>
      <div className='flex items-center justify-between mb-6'>
        <h1 className='text-2xl font-bold'>Bens Cadastrados</h1>
        <div className='flex items-center gap-2'>
          <button
            onClick={handleRefresh}
            className='px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors'
          >
            Atualizar
          </button>
          <Link
            to='/bens-cadastrados/novo'
            className='px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors'
          >
            Novo Bem
          </Link>
        </div>
      </div>

      {/* Barra de busca */}
      <div className='mb-6'>
        <input
          type='text'
          placeholder='Buscar por número, descrição, setor, local...'
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
        />
      </div>

      {/* Estatísticas */}
      <div className='grid grid-cols-1 md:grid-cols-4 gap-4 mb-6'>
        <div className='bg-white p-4 rounded-lg shadow'>
          <h3 className='text-sm font-medium text-gray-500'>Total de Bens</h3>
          <p className='text-2xl font-bold text-blue-600'>
            {patrimonios.length}
          </p>
        </div>
        <div className='bg-white p-4 rounded-lg shadow'>
          <h3 className='text-sm font-medium text-gray-500'>Bens Ativos</h3>
          <p className='text-2xl font-bold text-green-600'>
            {patrimonios.filter(p => p.status === 'ativo').length}
          </p>
        </div>
        <div className='bg-white p-4 rounded-lg shadow'>
          <h3 className='text-sm font-medium text-gray-500'>Em Manutenção</h3>
          <p className='text-2xl font-bold text-yellow-600'>
            {patrimonios.filter(p => p.status === 'manutencao').length}
          </p>
        </div>
        <div className='bg-white p-4 rounded-lg shadow'>
          <h3 className='text-sm font-medium text-gray-500'>
            Resultados da Busca
          </h3>
          <p className='text-2xl font-bold text-purple-600'>
            {filteredPatrimonios.length}
          </p>
        </div>
      </div>

      {/* Tabela de patrimônios */}
      <div className='bg-white rounded-lg shadow overflow-hidden'>
        <div className='overflow-x-auto'>
          <table className='min-w-full divide-y divide-gray-200'>
            <thead className='bg-gray-50'>
              <tr>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  Nº Patrimônio
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  Descrição
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  Setor
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  Localização
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  Status
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className='bg-white divide-y divide-gray-200'>
              {currentPatrimonios.map(patrimonio => (
                <tr key={patrimonio.id} className='hover:bg-gray-50'>
                  <td className='px-6 py-4 whitespace-nowrap'>
                    <Link
                      to={`/bens-cadastrados/ver/${patrimonio.id}`}
                      className='text-blue-600 hover:text-blue-800 font-medium'
                    >
                      {patrimonio.numero_patrimonio}
                    </Link>
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap'>
                    {patrimonio.descricao}
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap'>
                    {patrimonio.setor_responsavel || 'Não informado'}
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap'>
                    {patrimonio.local_objeto || 'Não informado'}
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap'>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        patrimonio.status === 'ativo'
                          ? 'bg-green-100 text-green-800'
                          : patrimonio.status === 'manutencao'
                            ? 'bg-yellow-100 text-yellow-800'
                            : patrimonio.status === 'baixado'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {patrimonio.status || 'Não informado'}
                    </span>
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap text-sm font-medium'>
                    <div className='flex items-center gap-2'>
                      <Link
                        to={`/bens-cadastrados/editar/${patrimonio.id}`}
                        className='text-blue-600 hover:text-blue-800'
                      >
                        Editar
                      </Link>
                      <Link
                        to={`/bens-cadastrados/ver/${patrimonio.id}`}
                        className='text-green-600 hover:text-green-800'
                      >
                        Ver
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className='bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6'>
            <div className='flex-1 flex justify-between sm:hidden'>
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className='relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
              >
                Anterior
              </button>
              <button
                onClick={() =>
                  setCurrentPage(Math.min(totalPages, currentPage + 1))
                }
                disabled={currentPage === totalPages}
                className='ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
              >
                Próximo
              </button>
            </div>
            <div className='hidden sm:flex-1 sm:flex sm:items-center sm:justify-between'>
              <div>
                <p className='text-sm text-gray-700'>
                  Mostrando{' '}
                  <span className='font-medium'>{startIndex + 1}</span> a{' '}
                  <span className='font-medium'>
                    {Math.min(endIndex, filteredPatrimonios.length)}
                  </span>{' '}
                  de{' '}
                  <span className='font-medium'>
                    {filteredPatrimonios.length}
                  </span>{' '}
                  resultados
                </p>
              </div>
              <div>
                <nav className='relative z-0 inline-flex rounded-md shadow-sm -space-x-px'>
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className='relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
                  >
                    Anterior
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          currentPage === page
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    )
                  )}
                  <button
                    onClick={() =>
                      setCurrentPage(Math.min(totalPages, currentPage + 1))
                    }
                    disabled={currentPage === totalPages}
                    className='relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
                  >
                    Próximo
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mensagem quando não há dados */}
      {filteredPatrimonios.length === 0 && (
        <div className='text-center py-12'>
          <p className='text-gray-500 text-lg'>
            {searchTerm
              ? 'Nenhum patrimônio encontrado para sua busca.'
              : 'Nenhum patrimônio cadastrado.'}
          </p>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className='mt-2 text-blue-600 hover:text-blue-800'
            >
              Limpar busca
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default BensCadastrados;
