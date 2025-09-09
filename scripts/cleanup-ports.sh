#!/bin/bash

# SISPAT - Script de Limpeza de Portas
# Este script limpa processos que estão ocupando as portas do SISPAT

set -e

echo "🧹 Limpando portas do SISPAT..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

# Portas do SISPAT
PORTS=(3001 5173 3002 3003)

# Função para limpar porta no Windows
cleanup_windows() {
    local port=$1
    
    log "Verificando porta $port..."
    
    # Encontrar processo usando a porta
    local pid=$(netstat -ano | findstr ":$port " | awk '{print $5}' | head -1)
    
    if [ -n "$pid" ] && [ "$pid" != "0" ]; then
        log "Processo $pid está usando a porta $port"
        
        # Verificar se é um processo Node.js
        local process_name=$(tasklist /FI "PID eq $pid" /FO CSV | tail -1 | cut -d',' -f1 | tr -d '"')
        
        if [ "$process_name" = "node.exe" ]; then
            log "Finalizando processo Node.js $pid na porta $port..."
            taskkill /PID $pid /F
            log "✅ Processo $pid finalizado"
        else
            warn "Processo $process_name ($pid) está usando a porta $port"
        fi
    else
        log "✅ Porta $port está livre"
    fi
}

# Função para limpar porta no Linux
cleanup_linux() {
    local port=$1
    
    log "Verificando porta $port..."
    
    # Encontrar processo usando a porta
    local pid=$(lsof -ti:$port 2>/dev/null || echo "")
    
    if [ -n "$pid" ]; then
        log "Processo $pid está usando a porta $port"
        
        # Verificar se é um processo Node.js
        local process_name=$(ps -p $pid -o comm= 2>/dev/null || echo "")
        
        if [[ "$process_name" == *"node"* ]]; then
            log "Finalizando processo Node.js $pid na porta $port..."
            kill -9 $pid
            log "✅ Processo $pid finalizado"
        else
            warn "Processo $process_name ($pid) está usando a porta $port"
        fi
    else
        log "✅ Porta $port está livre"
    fi
}

# Detectar sistema operacional
if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "win32" ]]; then
    log "Sistema Windows detectado"
    
    # Limpar todas as portas
    for port in "${PORTS[@]}"; do
        cleanup_windows $port
    done
    
    # Limpar todos os processos Node.js se necessário
    log "Verificando processos Node.js restantes..."
    local node_count=$(tasklist | findstr node.exe | wc -l)
    
    if [ $node_count -gt 0 ]; then
        warn "Ainda há $node_count processos Node.js rodando"
        read -p "Deseja finalizar todos os processos Node.js? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            taskkill /IM node.exe /F
            log "✅ Todos os processos Node.js finalizados"
        fi
    fi
    
elif [[ "$OSTYPE" == "linux-gnu"* ]] || [[ "$OSTYPE" == "darwin"* ]]; then
    log "Sistema Linux/macOS detectado"
    
    # Limpar todas as portas
    for port in "${PORTS[@]}"; do
        cleanup_linux $port
    done
    
    # Limpar todos os processos Node.js se necessário
    log "Verificando processos Node.js restantes..."
    local node_count=$(pgrep node | wc -l)
    
    if [ $node_count -gt 0 ]; then
        warn "Ainda há $node_count processos Node.js rodando"
        read -p "Deseja finalizar todos os processos Node.js? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            pkill -f node
            log "✅ Todos os processos Node.js finalizados"
        fi
    fi
    
else
    error "Sistema operacional não suportado: $OSTYPE"
    exit 1
fi

# Verificar se as portas estão livres
log "Verificando se as portas estão livres..."

for port in "${PORTS[@]}"; do
    if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "win32" ]]; then
        local result=$(netstat -ano | findstr ":$port " | wc -l)
    else
        local result=$(lsof -ti:$port 2>/dev/null | wc -l)
    fi
    
    if [ $result -eq 0 ]; then
        log "✅ Porta $port está livre"
    else
        warn "⚠️ Porta $port ainda está em uso"
    fi
done

log "🎉 Limpeza de portas concluída!"
log ""
log "📋 Resumo:"
log "   • Portas verificadas: ${PORTS[*]}"
log "   • Processos Node.js: Finalizados"
log "   • Status: Pronto para iniciar o SISPAT"
log ""
log "Para iniciar o SISPAT:"
log "  npm run dev"
log "  ou"
log "  npm start"
