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
    <div className='min-h-screen bg-gradient-to-br from-gray-50 to-gray-100'>
      <div className='container mx-auto p-6'>
        {/* Header com gradiente e sombra */}
        <div className='bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-8'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-4'>
              <div className='w-12 h-12 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg flex items-center justify-center'>
                <svg className='w-6 h-6 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' />
                </svg>
              </div>
              <div>
                <h1 className='text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent'>
                  Bens Cadastrados
                </h1>
                <p className='text-gray-600 mt-1'>Gerencie todos os patrimônios do sistema</p>
              </div>
            </div>
            <div className='flex items-center gap-3'>
              <button
                onClick={handleRefresh}
                className='px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center gap-2'
              >
                <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' />
                </svg>
                Atualizar
              </button>
              <Link
                to='/bens-cadastrados/novo'
                className='px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center gap-2'
              >
                <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 6v6m0 0v6m0-6h6m-6 0H6' />
                </svg>
                Novo Bem
              </Link>
            </div>
          </div>
        </div>

        {/* Barra de busca moderna */}
        <div className='bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-8'>
          <div className='relative'>
            <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none'>
              <svg className='h-5 w-5 text-gray-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' />
              </svg>
            </div>
            <input
              type='text'
              placeholder='Buscar por número, descrição, setor, local...'
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className='w-full pl-12 pr-4 py-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500 bg-gray-50 focus:bg-white transition-all duration-200 text-lg'
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className='absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600'
              >
                <svg className='h-5 w-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Cards de estatísticas compactos */}
        <div className='grid grid-cols-4 gap-4 mb-6'>
          <div className='bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-sm border border-blue-200 p-4 hover:shadow-md transition-all duration-200'>
            <div className='flex items-center justify-between'>
              <div>
                <h3 className='text-xs font-medium text-blue-700 mb-1'>Total de Bens</h3>
                <p className='text-2xl font-bold text-blue-800'>
                  {patrimonios.length}
                </p>
              </div>
              <div className='w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center'>
                <svg className='w-4 h-4 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' />
                </svg>
              </div>
            </div>
          </div>
          
          <div className='bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-sm border border-green-200 p-4 hover:shadow-md transition-all duration-200'>
            <div className='flex items-center justify-between'>
              <div>
                <h3 className='text-xs font-medium text-green-700 mb-1'>Bens Ativos</h3>
                <p className='text-2xl font-bold text-green-800'>
                  {patrimonios.filter(p => p.status === 'ativo').length}
                </p>
              </div>
              <div className='w-8 h-8 bg-green-500 rounded-md flex items-center justify-center'>
                <svg className='w-4 h-4 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' />
                </svg>
              </div>
            </div>
          </div>
          
          <div className='bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg shadow-sm border border-orange-200 p-4 hover:shadow-md transition-all duration-200'>
            <div className='flex items-center justify-between'>
              <div>
                <h3 className='text-xs font-medium text-orange-700 mb-1'>Em Manutenção</h3>
                <p className='text-2xl font-bold text-orange-800'>
                  {patrimonios.filter(p => p.status === 'manutencao').length}
                </p>
              </div>
              <div className='w-8 h-8 bg-orange-500 rounded-md flex items-center justify-center'>
                <svg className='w-4 h-4 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' />
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 12a3 3 0 11-6 0 3 3 0 016 0z' />
                </svg>
              </div>
            </div>
          </div>
          
          <div className='bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg shadow-sm border border-purple-200 p-4 hover:shadow-md transition-all duration-200'>
            <div className='flex items-center justify-between'>
              <div>
                <h3 className='text-xs font-medium text-purple-700 mb-1'>
                  Resultados da Busca
                </h3>
                <p className='text-2xl font-bold text-purple-800'>
                  {filteredPatrimonios.length}
                </p>
              </div>
              <div className='w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center'>
                <svg className='w-4 h-4 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Tabela de patrimônios moderna */}
        <div className='bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden'>
          <div className='bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200'>
            <h2 className='text-lg font-semibold text-gray-800'>Lista de Patrimônios</h2>
            <p className='text-sm text-gray-600'>Gerencie todos os bens cadastrados no sistema</p>
          </div>
          <div className='overflow-x-auto'>
            <table className='min-w-full divide-y divide-gray-200'>
              <thead className='bg-gradient-to-r from-gray-50 to-gray-100'>
                <tr>
                  <th className='px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider'>
                    Nº PATRIMÔNIO
                  </th>
                  <th className='px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider'>
                    DESCRIÇÃO
                  </th>
                  <th className='px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider'>
                    SETOR
                  </th>
                  <th className='px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider'>
                    LOCALIZAÇÃO
                  </th>
                  <th className='px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider'>
                    STATUS
                  </th>
                  <th className='px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider'>
                    AÇÕES
                  </th>
                </tr>
              </thead>
              <tbody className='bg-white divide-y divide-gray-200'>
                {currentPatrimonios.map(patrimonio => (
                  <tr key={patrimonio.id} className='hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200'>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <Link
                        to={`/bens-cadastrados/ver/${patrimonio.id}`}
                        className='text-blue-600 hover:text-blue-800 font-semibold text-sm hover:underline transition-colors duration-200'
                      >
                        {patrimonio.numero_patrimonio}
                      </Link>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium'>
                      {patrimonio.descricao}
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-700'>
                      {patrimonio.setor_responsavel || 'Não informado'}
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-700'>
                      {patrimonio.local_objeto || 'Não informado'}
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <span
                        className={`px-4 py-2 text-xs font-semibold rounded-full shadow-sm ${
                          patrimonio.status === 'ativo'
                            ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300'
                            : patrimonio.status === 'manutencao'
                              ? 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-300'
                              : patrimonio.status === 'baixado'
                                ? 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300'
                                : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300'
                        }`}
                      >
                        {patrimonio.status || 'Não informado'}
                      </span>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm font-medium'>
                      <div className='flex items-center gap-3'>
                        <Link
                          to={`/bens-cadastrados/editar/${patrimonio.id}`}
                          className='px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors duration-200 font-medium text-xs'
                        >
                          Editar
                        </Link>
                        <Link
                          to={`/bens-cadastrados/ver/${patrimonio.id}`}
                          className='px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors duration-200 font-medium text-xs'
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

          {/* Paginação moderna */}
          {totalPages > 1 && (
            <div className='bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-t border-gray-200'>
              <div className='flex items-center justify-between'>
                <div className='flex-1 flex justify-between sm:hidden'>
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className='relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm'
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() =>
                      setCurrentPage(Math.min(totalPages, currentPage + 1))
                    }
                    disabled={currentPage === totalPages}
                    className='ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm'
                  >
                    Próximo
                  </button>
                </div>
                <div className='hidden sm:flex-1 sm:flex sm:items-center sm:justify-between'>
                  <div>
                    <p className='text-sm text-gray-700'>
                      Mostrando{' '}
                      <span className='font-semibold text-gray-900'>{startIndex + 1}</span> a{' '}
                      <span className='font-semibold text-gray-900'>
                        {Math.min(endIndex, filteredPatrimonios.length)}
                      </span>{' '}
                      de{' '}
                      <span className='font-semibold text-gray-900'>
                        {filteredPatrimonios.length}
                      </span>{' '}
                      resultados
                    </p>
                  </div>
                  <div>
                    <nav className='relative z-0 inline-flex rounded-lg shadow-sm -space-x-px'>
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className='relative inline-flex items-center px-3 py-2 rounded-l-lg border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200'
                      >
                        Anterior
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                        page => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium transition-all duration-200 ${
                              currentPage === page
                                ? 'z-10 bg-blue-600 border-blue-600 text-white shadow-lg'
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
                        className='relative inline-flex items-center px-3 py-2 rounded-r-lg border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200'
                      >
                        Próximo
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mensagem quando não há dados */}
        {filteredPatrimonios.length === 0 && (
          <div className='bg-white rounded-xl shadow-lg border border-gray-200 p-12 text-center'>
            <div className='w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6'>
              <svg className='w-12 h-12 text-gray-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.47-.881-6.08-2.33M15 6.709A7.962 7.962 0 0112 4c-2.34 0-4.47.881-6.08 2.33' />
              </svg>
            </div>
            <h3 className='text-xl font-semibold text-gray-900 mb-2'>
              {searchTerm ? 'Nenhum patrimônio encontrado' : 'Nenhum patrimônio cadastrado'}
            </h3>
            <p className='text-gray-600 mb-6'>
              {searchTerm
                ? 'Tente ajustar os termos da sua busca ou limpar os filtros.'
                : 'Comece cadastrando o primeiro patrimônio do sistema.'}
            </p>
            {searchTerm ? (
              <button
                onClick={() => setSearchTerm('')}
                className='px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium'
              >
                Limpar busca
              </button>
            ) : (
              <Link
                to='/bens-cadastrados/novo'
                className='inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 font-medium'
              >
                <svg className='w-4 h-4 mr-2' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 6v6m0 0v6m0-6h6m-6 0H6' />
                </svg>
                Cadastrar Primeiro Bem
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BensCadastrados;
