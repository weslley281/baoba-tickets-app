import { TicketManager } from './ticket';

const tm = new TicketManager();

document.addEventListener('DOMContentLoaded', () => {
    const painel = document.getElementById('painel') as HTMLDivElement;
    const btnComum = document.getElementById('btnComum') as HTMLButtonElement;
    const btnPrioritario = document.getElementById('btnPrioritario') as HTMLButtonElement;
    const formChamada = document.getElementById('formChamada') as HTMLFormElement;
    const inputAtendente = document.getElementById('atendente') as HTMLInputElement;
    const ticketDisplay = document.getElementById('ticketDisplay') as HTMLDivElement;

    // Atualiza o painel de chamados
    function atualizarPainel() {
        const chamados = tm.panel();
        painel.innerHTML = '';

        if (chamados.length === 0) {
            painel.innerHTML = `<div class="alert alert-warning">Nenhum atendimento registrado hoje.</div>`;
            return;
        }

        chamados.forEach((c) => {
            const div = document.createElement('div');
            div.className = 'alert alert-secondary';
            div.innerHTML = `<strong>${c.ticket}</strong> chamado por Atendente <strong>${c.atendente}</strong> às <strong>${c.hora}</strong>`;
            painel.appendChild(div);
        });
    }

    // Gerar ticket comum ou prioritário
    function gerarTicket(tipo: 'comum' | 'prioritario') {
        const ticket = tm.generator(tipo);
        ticketDisplay.innerHTML = `
            <div class="alert alert-success text-center">
                <h4>Seu ticket:</h4>
                <h2 class="display-4">${ticket}</h2>
                <button class="btn btn-outline-dark mt-2" onclick="window.print()">Imprimir</button>
            </div>
        `;
    }

    // Eventos de clique
    btnComum.addEventListener('click', () => gerarTicket('comum'));
    btnPrioritario.addEventListener('click', () => gerarTicket('prioritario'));

    formChamada.addEventListener('submit', (e) => {
        e.preventDefault();
        const numero = parseInt(inputAtendente.value);
        if (!numero || numero < 1) {
            alert('Informe um número de atendente válido.');
            return;
        }

        const chamado = tm.call(numero);
        if (chamado) {
            alert(`Chamando: ${chamado.ticket} no atendente ${chamado.atendente}`);
        } else {
            alert('Nenhum cliente na fila.');
        }

        inputAtendente.value = '';
        atualizarPainel();
    });

    // Atualiza painel a cada 5s
    setInterval(atualizarPainel, 5000);
    atualizarPainel(); // inicial
});
