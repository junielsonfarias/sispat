import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { Command as CommandPrimitive } from 'cmdk';
import { X } from 'lucide-react';
import * as React from 'react';

export type MultiSelectOption = {
  value: string;
  label: string;
};

interface MultiSelectProps {
  options: MultiSelectOption[];
  selected?: string[];
  value?: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function MultiSelect({
  options,
  selected,
  value,
  onChange,
  placeholder = 'Selecione as opções...',
  className,
  disabled = false,
}: MultiSelectProps) {
  // Usar value ou selected, garantindo que seja sempre um array
  const selectedValues = value || selected || [];
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState('');

  const handleUnselect = (value: string) => {
    onChange(selectedValues.filter(s => s !== value));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const input = inputRef.current;
    if (input) {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (input.value === '') {
          const newSelected = [...selectedValues];
          newSelected.pop();
          onChange(newSelected);
        }
      }
      if (e.key === 'Escape') {
        input.blur();
      }
    }
  };

  const selectables = options.filter(
    option => !selectedValues.includes(option.value)
  );

  return (
    <Command
      onKeyDown={handleKeyDown}
      className={cn('overflow-visible bg-transparent', className)}
      disabled={disabled}
    >
      <div className='group border border-input px-3 py-2 text-sm ring-offset-background rounded-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2'>
        <div className='flex gap-1 flex-wrap'>
          {selectedValues.map(value => {
            const option = options.find(o => o.value === value);
            return (
              <Badge key={value} variant='secondary'>
                {option?.label}
                <button
                  className='ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
                  onMouseDown={e => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={() => handleUnselect(value)}
                >
                  <X className='h-3 w-3 text-muted-foreground hover:text-foreground' />
                </button>
              </Badge>
            );
          })}
          <CommandPrimitive.Input
            ref={inputRef}
            value={inputValue}
            onValueChange={setInputValue}
            onBlur={() => setOpen(false)}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className='ml-2 bg-transparent outline-none placeholder:text-muted-foreground flex-1'
          />
        </div>
      </div>
      <div className='relative mt-2'>
        {open && selectables.length > 0 ? (
          <div className='absolute w-full z-10 top-0 rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in'>
            <CommandList>
              <CommandGroup className='h-full overflow-auto'>
                {selectables.map(option => {
                  return (
                    <CommandItem
                      key={option.value}
                      onMouseDown={e => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onSelect={() => {
                        setInputValue('');
                        onChange([...selectedValues, option.value]);
                      }}
                      className={'cursor-pointer'}
                    >
                      {option.label}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </div>
        ) : null}
      </div>
    </Command>
  );
}
