import * as fs from 'fs';
import * as path from 'path';

type TicketTipo = 'comum' | 'prioritario';

interface TicketChamado {
    ticket: string;
    atendente: number;
    hora: string;
}

interface TicketData {
    lastCommon: number;
    lastPriority: number;
    queueCommon: string[];
    queuePriority: string[];
    called: TicketChamado[];
}

export class TicketManager {
    private filePath: string;

    constructor() {
        const hoje = new Date().toISOString().slice(0, 10);
        const dataDir = path.join(__dirname, '../data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir);
        }
        this.filePath = path.join(dataDir, `tickets_${hoje}.json`);
    }

    private loadData(): TicketData {
        if (!fs.existsSync(this.filePath)) {
            return {
                lastCommon: 0,
                lastPriority: 0,
                queueCommon: [],
                queuePriority: [],
                called: []
            };
        }

        const raw = fs.readFileSync(this.filePath, 'utf-8');
        return JSON.parse(raw) as TicketData;
    }

    private saveData(data: TicketData): void {
        fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
    }

    public generator(tipo: TicketTipo): string {
        const data = this.loadData();
        let novoTicket: string;

        if (tipo === 'prioritario') {
            data.lastPriority++;
            novoTicket = 'P' + String(data.lastPriority).padStart(3, '0');
            data.queuePriority.push(novoTicket);
        } else {
            data.lastCommon++;
            novoTicket = 'C' + String(data.lastCommon).padStart(3, '0');
            data.queueCommon.push(novoTicket);
        }

        this.saveData(data);
        return novoTicket;
    }

    public call(atendente: number): TicketChamado | null {
        const data = this.loadData();
        let proximo: string | undefined;

        if (data.queuePriority.length > 0) {
            proximo = data.queuePriority.shift();
        } else if (data.queueCommon.length > 0) {
            proximo = data.queueCommon.shift();
        }

        if (proximo) {
            const hora = new Date().toLocaleTimeString('pt-BR');
            const chamado: TicketChamado = {
                ticket: proximo,
                atendente,
                hora
            };
            data.called.push(chamado);
            this.saveData(data);
            return chamado;
        }

        return null;
    }

    public panel(): TicketChamado[] {
        const data = this.loadData();
        return data.called.slice(-4).reverse(); // Últimos 4, mais recente primeiro
    }
}
