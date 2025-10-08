import { Patrimonio } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { MUNICIPALITY_NAME } from '@/config/municipality'

interface SimplePrintFormProps {
  patrimonio: Patrimonio
  fieldsToPrint: string[]
}

export const SimplePrintForm = ({ patrimonio, fieldsToPrint }: SimplePrintFormProps) => {
  console.log('SimplePrintForm renderizado:', { patrimonio: patrimonio?.numero_patrimonio, fieldsToPrint })

  const shouldPrint = (fieldId: keyof Patrimonio) =>
    fieldsToPrint.includes(fieldId)

  return (
    <div style={{
      padding: '20px',
      backgroundColor: 'white',
      color: 'black',
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      lineHeight: '1.4',
      width: '100%',
      minHeight: '297mm'
    }}>
      {/* Cabeçalho */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '2px solid black',
        paddingBottom: '10px',
        marginBottom: '20px'
      }}>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 5px 0' }}>
            {MUNICIPALITY_NAME}
          </h1>
          <h2 style={{ fontSize: '16px', margin: '0' }}>
            Ficha de Cadastro Patrimonial
          </h2>
        </div>
        <div style={{ textAlign: 'right' }}>
          {shouldPrint('numero_patrimonio') && (
            <p style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 5px 0' }}>
              Nº: {patrimonio.numero_patrimonio || patrimonio.numeroPatrimonio}
            </p>
          )}
          <p style={{ margin: '0' }}>
            Data: {formatDate(new Date())}
          </p>
        </div>
      </div>

      {/* Informações do Bem */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ 
          fontSize: '14px', 
          fontWeight: 'bold', 
          borderBottom: '1px solid black',
          marginBottom: '10px',
          paddingBottom: '5px'
        }}>
          INFORMAÇÕES DO BEM
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '5px' }}>
          {shouldPrint('descricao_bem') && (
            <>
              <div style={{ fontWeight: 'bold' }}>Descrição:</div>
              <div>{patrimonio.descricao_bem || patrimonio.descricaoBem}</div>
            </>
          )}
          {shouldPrint('tipo') && (
            <>
              <div style={{ fontWeight: 'bold' }}>Tipo:</div>
              <div>{patrimonio.tipo}</div>
            </>
          )}
          {shouldPrint('marca') && (
            <>
              <div style={{ fontWeight: 'bold' }}>Marca:</div>
              <div>{patrimonio.marca}</div>
            </>
          )}
          {shouldPrint('modelo') && (
            <>
              <div style={{ fontWeight: 'bold' }}>Modelo:</div>
              <div>{patrimonio.modelo}</div>
            </>
          )}
        </div>
      </div>

      {/* Informações de Aquisição */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ 
          fontSize: '14px', 
          fontWeight: 'bold', 
          borderBottom: '1px solid black',
          marginBottom: '10px',
          paddingBottom: '5px'
        }}>
          INFORMAÇÕES DE AQUISIÇÃO
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '5px' }}>
          {shouldPrint('data_aquisicao') && (
            <>
              <div style={{ fontWeight: 'bold' }}>Data de Aquisição:</div>
              <div>{formatDate(new Date(patrimonio.data_aquisicao || patrimonio.dataAquisicao))}</div>
            </>
          )}
          {shouldPrint('valor_aquisicao') && (
            <>
              <div style={{ fontWeight: 'bold' }}>Valor de Aquisição:</div>
              <div>{formatCurrency(patrimonio.valor_aquisicao || patrimonio.valorAquisicao)}</div>
            </>
          )}
        </div>
      </div>

      {/* Localização e Estado */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ 
          fontSize: '14px', 
          fontWeight: 'bold', 
          borderBottom: '1px solid black',
          marginBottom: '10px',
          paddingBottom: '5px'
        }}>
          LOCALIZAÇÃO E ESTADO
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '5px' }}>
          {shouldPrint('setor_responsavel') && (
            <>
              <div style={{ fontWeight: 'bold' }}>Setor Responsável:</div>
              <div>{patrimonio.setor_responsavel}</div>
            </>
          )}
          {shouldPrint('local_objeto') && (
            <>
              <div style={{ fontWeight: 'bold' }}>Localização:</div>
              <div>{patrimonio.local_objeto}</div>
            </>
          )}
          {shouldPrint('status') && (
            <>
              <div style={{ fontWeight: 'bold' }}>Status:</div>
              <div>{patrimonio.status.toUpperCase()}</div>
            </>
          )}
        </div>
      </div>

      {/* Rodapé */}
      <div style={{ 
        marginTop: '40px',
        display: 'flex',
        justifyContent: 'space-around'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            borderTop: '1px solid black',
            width: '200px',
            paddingTop: '5px'
          }}>
            <p style={{ margin: '0', fontSize: '11px' }}>Responsável pelo Setor</p>
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            borderTop: '1px solid black',
            width: '200px',
            paddingTop: '5px'
          }}>
            <p style={{ margin: '0', fontSize: '11px' }}>Responsável pelo Patrimônio</p>
          </div>
        </div>
      </div>

      <div style={{ 
        textAlign: 'center',
        marginTop: '20px',
        fontSize: '10px',
        color: '#666'
      }}>
        Documento gerado por SISPAT em {formatDate(new Date(), "dd/MM/yyyy 'às' HH:mm")}
      </div>
    </div>
  )
}
