// Configura o comportamento padrão para abrir o side panel quando o ícone da extensão for clicado
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error("Erro ao configurar comportamento do side panel:", error));

// Cria o item de menu de contexto ao instalar/atualizar a extensão
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "analyze-selection",
    title: "Analisar com Job Fit",
    contexts: ["selection"]
  });
  console.log("Menu de contexto criado com sucesso.");
});

// Manipula cliques no menu de contexto
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "analyze-selection" && tab) {
    const selectedText = info.selectionText;
    
    // Abre o Side Panel na aba ativa
    chrome.sidePanel.open({ windowId: tab.windowId })
      .then(() => {
        // Armazena temporariamente no storage para o Side Panel puxar após abrir
        chrome.storage.local.set({ tempJobDescription: selectedText }, () => {
          // Tenta enviar mensagem imediata caso o Side Panel já estivesse aberto
          chrome.runtime.sendMessage({ type: 'ANALYZE_SELECTION_TRIGGERED', text: selectedText })
            .catch(() => {
              // Ignora erro se o sidepanel ainda não estava escutando (ele pegará do storage ao carregar)
            });
        });
      })
      .catch((error) => console.error("Erro ao abrir side panel via menu de contexto:", error));
  }
});

// Escuta mensagens de fontes externas (site do Job Fit Analyzer)
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  console.log("Mensagem externa recebida:", message.type);
  
  if (message.type === 'SESSION_CHANGED') {
    const { user, authToken, resume, keys } = message;
    
    chrome.storage.local.set({
      user,
      authToken,
      resume,
      keys
    }, () => {
      // Notifica o Side Panel (se estiver aberto) para atualizar sua UI
      chrome.runtime.sendMessage({ type: 'SESSION_UPDATED' })
        .catch(() => {/* Ignora se o sidepanel não estiver aberto */});
        
      sendResponse({ success: true, message: "Sessão atualizada na extensão." });
    });
    return true; // Mantém o canal assíncrono ativo para responder
  }
  
  if (message.type === 'SESSION_CLEARED') {
    chrome.storage.local.remove(['user', 'authToken', 'resume', 'keys'], () => {
      chrome.runtime.sendMessage({ type: 'SESSION_UPDATED' })
        .catch(() => {/* Ignora se o sidepanel não estiver aberto */});
        
      sendResponse({ success: true, message: "Sessão limpa na extensão." });
    });
    return true;
  }
});
