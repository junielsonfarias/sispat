/**
 * Subcomponentes de FormField compartilhados entre BensCreate e BensEdit.
 *
 * Mantemos como subcomponentes (e não como um BensForm monolítico) porque
 * Create e Edit têm divergências legítimas que não devem ser unificadas:
 *  - Create gera número automaticamente; Edit mostra disabled
 *  - Create usa CurrencyInput em valor_aquisicao; Edit usa Input number
 *  - Create.situacao_bem tem "otimo"; Edit.situacao_bem tem "baixado"
 *  - Create.status: ativo/inativo/manutencao; Edit.status: adiciona baixado/extraviado
 *  - Create.local_objeto: Select filtrado por setor; Edit: Input livre
 *  - Create tem card de depreciação preview, sub-patrimônios; Edit não tem
 *
 * Apenas os campos identicamente compartilhados são extraídos aqui.
 * Reduz ~250 linhas por página sem forçar abstração frágil.
 */

import { Control, useWatch } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { TipoBem, AcquisitionForm } from '@/types'

interface IdentificacaoProps {
  control: Control<any>
  tiposBens: TipoBem[]
}

/**
 * Tipo + Marca + Modelo + Cor + Número de Série + Quantidade.
 * 6 campos em 2 grids (3 cols cada). Idênticos entre BensCreate e BensEdit.
 */
export const BensIdentificacaoFields = ({ control, tiposBens }: IdentificacaoProps) => (
  <>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <FormField
        control={control}
        name="tipo"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Tipo</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {tiposBens
                  .filter((tipo) => tipo.ativo)
                  .map((tipo) => (
                    <SelectItem key={tipo.id} value={tipo.nome}>
                      {tipo.nome}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="marca"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Marca</FormLabel>
            <FormControl>
              <Input {...field} placeholder="Ex: Dell, HP, Samsung" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="modelo"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Modelo</FormLabel>
            <FormControl>
              <Input {...field} placeholder="Ex: OptiPlex 3080" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <FormField
        control={control}
        name="cor"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Cor</FormLabel>
            <FormControl>
              <Input {...field} placeholder="Ex: Preto, Branco" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="numero_serie"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Número de Série</FormLabel>
            <FormControl>
              <Input {...field} placeholder="Ex: ABC123456789" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="quantidade"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Quantidade</FormLabel>
            <FormControl>
              <Input
                {...field}
                type="number"
                min="1"
                placeholder="1"
                onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  </>
)

interface AquisicaoProps {
  control: Control<any>
  activeAcquisitionForms: AcquisitionForm[]
}

// Origens de recurso que envolvem instrumento de repasse/encargo e portanto
// pedem o registro das cláusulas de reversão (Art. 13 §2 da Lei).
const ORIGENS_COM_REVERSAO = ['convenio', 'emenda', 'transferencia_ente']

/**
 * Data de aquisição + Forma de aquisição + Origem do recurso e cláusulas de
 * reversão (Art. 4 do Decreto / Art. 13 §2 da Lei). Idênticos entre Create e Edit.
 */
export const BensAquisicaoFields = ({ control, activeAcquisitionForms }: AquisicaoProps) => {
  const origemRecurso = useWatch({ control, name: 'origem_recurso' })
  const exibeReversao = ORIGENS_COM_REVERSAO.includes(origemRecurso)

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={control}
          name="data_aquisicao"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Data de Aquisição</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="date"
                  value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                  onChange={(e) => field.onChange(e.target.value)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="forma_aquisicao"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Forma de Aquisição</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a forma" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {activeAcquisitionForms.map((f) => (
                    <SelectItem key={f.id} value={f.nome}>
                      {f.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={control}
          name="origem_recurso"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Origem do Recurso</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a origem" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="proprio">Recursos próprios</SelectItem>
                  <SelectItem value="convenio">Convênio</SelectItem>
                  <SelectItem value="emenda">Emenda parlamentar</SelectItem>
                  <SelectItem value="transferencia_ente">Transferência de outro ente</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Bens de convênio/emenda/repasse devem registrar as cláusulas de reversão (Art. 13 §2).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {exibeReversao && (
          <FormField
            control={control}
            name="clausulas_reversao"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cláusulas de Reversão</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    value={field.value ?? ''}
                    placeholder="Condições, encargos e cláusulas de reversão do instrumento de repasse."
                    rows={3}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>
    </>
  )
}

interface LicitacaoProps {
  control: Control<any>
}

/**
 * Número de referência + Ano de referência (campo "licitação").
 * Idêntico entre Create e Edit (Edit tem `value={field.value || ''}` extra,
 * mas isso é defensivo para fields opcionais — vamos manter aqui).
 */
export const BensLicitacaoFields = ({ control }: LicitacaoProps) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <FormField
      control={control}
      name="numero_licitacao"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Número de Referência</FormLabel>
          <FormControl>
            <Input {...field} placeholder="Ex: 001/2025" value={field.value || ''} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />

    <FormField
      control={control}
      name="ano_licitacao"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Ano de Referência</FormLabel>
          <FormControl>
            <Input
              type="number"
              {...field}
              value={field.value || ''}
              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="Ex: 2025"
              min="2000"
              max="2100"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  </div>
)

interface NotaFiscalProps {
  control: Control<any>
}

/** Número da Nota Fiscal — único campo solo em grid 2 cols. */
export const BensNotaFiscalField = ({ control }: NotaFiscalProps) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <FormField
      control={control}
      name="numero_nota_fiscal"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Número da Nota Fiscal</FormLabel>
          <FormControl>
            <Input {...field} placeholder="Ex: 123456" />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  </div>
)
