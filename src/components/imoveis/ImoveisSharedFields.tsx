/**
 * Subcomponentes de FormField compartilhados entre ImoveisCreate e ImoveisEdit.
 *
 * Mesma filosofia do BensSharedFields: só extraio campos idênticos entre as
 * duas páginas. Diferenças (geração de número, customFields, latitude/longitude,
 * tipo_imovel, situacao no Create) ficam em cada page.
 */

import { Control } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { CurrencyInput } from '@/components/ui/currency-input'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

interface ControlProps {
  control: Control<any>
}

/** Denominação + Endereço + endereço estruturado (cep/bairro/cidade/estado). */
export const ImoveisBasicoFields = ({ control }: ControlProps) => (
  <>
    <FormField
      control={control}
      name="denominacao"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Denominação</FormLabel>
          <FormControl>
            <Input {...field} placeholder="Ex: Escola Municipal" />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />

    <FormField
      control={control}
      name="endereco"
      render={({ field }) => (
        <FormItem className="md:col-span-2">
          <FormLabel>Endereço</FormLabel>
          <FormControl>
            <Textarea {...field} placeholder="Logradouro, número, complemento" />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />

    <FormField
      control={control}
      name="cep"
      render={({ field }) => (
        <FormItem>
          <FormLabel>CEP</FormLabel>
          <FormControl>
            <Input
              {...field}
              value={field.value ?? ''}
              placeholder="00000-000"
              maxLength={9}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />

    <FormField
      control={control}
      name="bairro"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Bairro</FormLabel>
          <FormControl>
            <Input {...field} value={field.value ?? ''} placeholder="Ex: Centro" />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />

    <FormField
      control={control}
      name="cidade"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Cidade</FormLabel>
          <FormControl>
            <Input {...field} value={field.value ?? ''} placeholder="Ex: São Sebastião da Boa Vista" />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />

    <FormField
      control={control}
      name="estado"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Estado (UF)</FormLabel>
          <FormControl>
            <Input
              {...field}
              value={field.value ?? ''}
              placeholder="PA"
              maxLength={2}
              onChange={(e) => field.onChange(e.target.value.toUpperCase())}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  </>
)

/** Data de aquisição — Input type=date. */
export const ImoveisDataAquisicaoField = ({ control }: ControlProps) => (
  <FormField
    control={control}
    name="data_aquisicao"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Data de Aquisição</FormLabel>
        <FormControl>
          <Input type="date" {...field} />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
)

/** Valor de aquisição — CurrencyInput. */
export const ImoveisValorField = ({ control }: ControlProps) => (
  <FormField
    control={control}
    name="valor_aquisicao"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Valor de Aquisição</FormLabel>
        <FormControl>
          <CurrencyInput value={field.value} onChange={field.onChange} placeholder="R$ 0,00" />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
)

/** Área do terreno + Área construída (m²). Idênticos. */
export const ImoveisAreaFields = ({ control }: ControlProps) => (
  <>
    <FormField
      control={control}
      name="area_terreno"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Área do Terreno (m²)</FormLabel>
          <FormControl>
            <Input
              type="number"
              step="0.01"
              min="0"
              {...field}
              value={field.value ?? ''}
              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
              placeholder="Ex: 500"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />

    <FormField
      control={control}
      name="area_construida"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Área Construída (m²)</FormLabel>
          <FormControl>
            <Input
              type="number"
              step="0.01"
              min="0"
              {...field}
              value={field.value ?? ''}
              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
              placeholder="Ex: 300"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  </>
)
