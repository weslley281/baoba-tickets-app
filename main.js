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
  const hoje = format(new Date(), 'yyyy-MM-dd');
  const pasta = path.join(__dirname, 'filas do dia');
  const arquivoDoDia = path.join(pasta, `${hoje}.json`);

  if (!fs.existsSync(pasta)) fs.mkdirSync(pasta);

  let dados = { comum: [], prioritario: [] };

  if (fs.existsSync(arquivoDoDia)) {
    const conteudo = fs.readFileSync(arquivoDoDia);
    dados = JSON.parse(conteudo);
  }

  const numero = (dados[tipo].length + 1).toString().padStart(3, '0');
  const codigo = (tipo === 'prioritario' ? 'P' : 'C') + numero;

  dados[tipo].push({ codigo, data: new Date().toISOString() });

  fs.writeFileSync(arquivoDoDia, JSON.stringify(dados, null, 2));

  // Geração e impressão do ticket
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
            <p>Tipo: ${tipo}</p>
            <p>Baobá Ervas e Cereais</p>
        </body>
        </html>
    `;

  const printWindow = new BrowserWindow({ show: false });
  printWindow.loadURL(
    'data:text/html;charset=utf-8,' + encodeURIComponent(cupomHTML)
  );

  printWindow.webContents.on('did-finish-load', () => {
    printWindow.webContents.print(
      {
        silent: true,
        printBackground: true,
        deviceName: 'Brother HL-1200 series', // Substitua pelo nome da sua impressora
      },
      () => {
        printWindow.close();
      }
    );
  });

  return { codigo };
});
