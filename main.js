const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { format } = require('date-fns');
require('electron-reload')(__dirname, {
  electron: path.join(__dirname, 'node_modules', '.bin', 'electron'),
  awaitWriteFinish: true,
});

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // Habilitado para usar `require` no renderer
      preload: path.join(__dirname, 'preload.js'), // Preload script para segurança
    },
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

//descobrindo impressoras disponíveis
// app.whenReady().then(() => {
//     const { webContents } = require('electron');
//     const tempWin = new BrowserWindow({ show: false });

//     tempWin.webContents.getPrintersAsync().then(printers => {
//         console.log("IMPRESSORAS DISPONÍVEIS:");
//         printers.forEach(printer => console.log(printer.name));
//     });
// });

// Geração do ticket
ipcMain.handle('gerar-ticket', async (event, tipo) => {
  const hoje = new Date().toISOString().split('T')[0]; // Ex: 2025-05-30
  const pasta = path.join(__dirname, 'filas do dia');
  const caminhoArquivo = path.join(pasta, `${hoje}.json`);

  // Garante que a pasta existe
  if (!fs.existsSync(pasta)) fs.mkdirSync(pasta);

  let dados;

  // Se o arquivo não existir, cria com estrutura base
  if (!fs.existsSync(caminhoArquivo)) {
    dados = {
      lastCommon: 0,
      lastPriority: 0,
      queueCommon: [],
      queuePriority: [],
      calledTickets: [],
    };
  } else {
    dados = JSON.parse(fs.readFileSync(caminhoArquivo, 'utf8'));
  }

  let codigo;

  if (tipo === 'prioritario') {
    dados.lastPriority++;
    codigo = `P${dados.lastPriority.toString().padStart(3, '0')}`;
    dados.queuePriority.push(codigo);
  } else {
    dados.lastCommon++;
    codigo = `C${dados.lastCommon.toString().padStart(3, '0')}`;
    dados.queueCommon.push(codigo);
  }

  // Salva o arquivo atualizado
  fs.writeFileSync(caminhoArquivo, JSON.stringify(dados, null, 2));

  // Geração do cupom HTML
  const cupomHTML = `
    <html>
    <head>
        <style>
            body { font-family: Arial; text-align: center; }
            h1 { font-size: 48px; margin: 20px 0; }
            p { font-size: 20px; }
        </style>
    </head>
    <body>
        <h1>${codigo}</h1>
        <p>Tipo: ${tipo === 'prioritario' ? 'Prioritário' : 'Comum'}</p>
        <p>Baobá Ervas e Cereais</p>
    </body>
    </html>
  `;

  // Cria janela invisível para impressão
  const printWindow = new BrowserWindow({ show: false });

  printWindow.loadURL(
    'data:text/html;charset=utf-8,' + encodeURIComponent(cupomHTML)
  );

  // Quando carregar o conteúdo, imprime direto
  printWindow.webContents.on('did-finish-load', () => {
    printWindow.webContents.print(
      {
        silent: true,
        printBackground: true,
        deviceName: 'Brother HL-1200 series', // Substitua pelo nome exato da sua impressora
      },
      () => {
        printWindow.close();
      }
    );
  });

  return { codigo };
});

// Manipulador para chamar ticket
ipcMain.handle('chamar-proximo', async (event, { atendente, tipo }) => {
  const hoje = new Date().toISOString().split('T')[0];
  const pasta = path.join(__dirname, 'filas do dia');
  const caminhoArquivo = path.join(pasta, `${hoje}.json`);

  if (!fs.existsSync(caminhoArquivo)) {
    return { ticket: null };
  }

  const dados = JSON.parse(fs.readFileSync(caminhoArquivo, 'utf8'));

  const fila = dados[tipo];
  if (fila.length === 0) {
    return { ticket: null };
  }

  const proximo = fila.shift(); // Remove o primeiro da fila
  dados.calledTickets.push({
    ...proximo,
    atendente,
    horaChamada: new Date().toISOString(),
  });

  fs.writeFileSync(caminhoArquivo, JSON.stringify(dados, null, 2));

  return { ticket: proximo.codigo, atendente };
});

// Manipulador para chamar ticket
ipcMain.handle('listar-chamados', async () => {
  const hoje = new Date().toISOString().split('T')[0];
  const caminho = path.join(__dirname, 'filas do dia', `${hoje}.json`);

  if (!fs.existsSync(caminho)) return [];

  const dados = JSON.parse(fs.readFileSync(caminho, 'utf-8'));
  const ultimosChamados = dados.calledTickets.slice(-10).reverse(); // últimos 10, mais recentes primeiro

  return ultimosChamados.map((ticket) => ({
    codigo: ticket.codigo,
    tipo: ticket.tipo,
    atendente: ticket.atendente || 'Desconhecido',
    hora: ticket.hora || new Date().toLocaleTimeString('pt-BR'),
    data: hoje.split('-').reverse().join('/'),
  }));
});
