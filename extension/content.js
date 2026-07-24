/**
 * Script de conteúdo injetado automaticamente nas abas do Job Fit Analyzer (estático)
 * e também injetado dinamicamente em páginas de vagas (para scraping).
 */

// Lógica de inicialização única (roda apenas uma vez por aba)
if (!window.__jobFitContentScriptInit) {
  window.__jobFitContentScriptInit = true;

  // Se estivermos no site do Job Fit Analyzer, injeta o ID da extensão no DOM
  const isJobFitSite = window.location.hostname === 'localhost' || 
                       window.location.hostname.includes('job-fit-analyzer') || 
                       window.location.hostname.includes('firebaseapp.com');

  if (isJobFitSite) {
    document.documentElement.setAttribute('data-job-fit-extension-id', chrome.runtime.id);
    console.log("[Job Fit Companion] Extensão detectada e conectada à página. ID:", chrome.runtime.id);

    // Escuta mensagens vindas do Side Panel da extensão
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'SYNC_PENDING_ANALYSES') {
        // Envia para a página React do site principal
        window.postMessage({
          source: 'job-fit-extension',
          type: 'SYNC_PENDING_ANALYSES',
          analyses: message.analyses
        }, '*');

        // Escuta a confirmação da página React de que salvou no Firestore
        const handleResponse = (event) => {
          if (event.data && event.data.source === 'job-fit-page' && event.data.type === 'SYNC_PENDING_ANALYSES_RESPONSE') {
            window.removeEventListener('message', handleResponse);
            sendResponse({ success: event.data.success });
          }
        };
        
        window.addEventListener('message', handleResponse);
        return true; // Mantém a resposta aberta assincronamente
      } else if (message.type === 'REQUEST_SESSION') {
        // Repassa solicitação de sessão para a página React do site principal
        window.postMessage({
          source: 'job-fit-extension',
          type: 'REQUEST_SESSION'
        }, '*');
        sendResponse({ success: true });
        return false;
      }
    });
  }
}

// O script retorna os dados da vaga se for executado dinamicamente para extração
(() => {
  // Evita executar scraping se estiver no site do Job Fit Analyzer para não coletar a própria interface
  const isJobFitSite = window.location.hostname === 'localhost' || 
                       window.location.hostname.includes('job-fit-analyzer') || 
                       window.location.hostname.includes('firebaseapp.com');
  if (isJobFitSite) {
    return { title: document.title, url: window.location.href, text: "" };
  }

  // Seletores de tags que geralmente contêm ruído
  const noiseSelectors = [
    'header', 'footer', 'nav', 'aside', 'script', 'style', 'noscript', 'iframe',
    '[role="banner"]', '[role="navigation"]', '[role="contentinfo"]',
    '#header', '#footer', '#navigation', '#menu', '.header', '.footer', '.menu', '.nav', '.sidebar'
  ];

  // Seletores comuns de descrição de vaga em plataformas conhecidas
  const jobContainerSelectors = [
    '.job-description', 
    '#job-description',
    '.jobs-description__container', // LinkedIn
    '.jobs-box__html-content', // LinkedIn
    '.job-desc',
    '#job-desc',
    '[class*="JobDescription"]',
    '[class*="jobDescription"]',
    '[id*="JobDescription"]',
    '[id*="jobDescription"]',
    'main',
    'article'
  ];

  // Helper para verificar se um elemento está visível
  function isVisible(elem) {
    if (!(elem instanceof HTMLElement)) return false;
    const style = window.getComputedStyle(elem);
    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
  }

  // Tenta achar um container específico de descrição primeiro
  let targetContainer = null;
  for (const selector of jobContainerSelectors) {
    const el = document.querySelector(selector);
    if (el && isVisible(el)) {
      targetContainer = el;
      break;
    }
  }

  // Se achou um container provável, usa ele. Caso contrário, usa o body.
  const rootElement = targetContainer || document.body;

  // Clona o nó para podermos manipulá-lo e remover o ruído sem quebrar a página do usuário
  const clone = rootElement.cloneNode(true);

  // Remove elementos de ruído conhecidos
  noiseSelectors.forEach(selector => {
    clone.querySelectorAll(selector).forEach(el => el.remove());
  });

  // Limpa elementos ocultos no clone também
  const walker = document.createTreeWalker(rootElement, NodeFilter.SHOW_ELEMENT);
  const hiddenElements = [];
  while (walker.nextNode()) {
    const currentNode = walker.currentNode;
    if (!isVisible(currentNode)) {
      if (currentNode.id) {
        hiddenElements.push(`#${currentNode.id}`);
      } else if (currentNode.className && typeof currentNode.className === 'string') {
        const firstClass = currentNode.className.split(' ')[0];
        if (firstClass && !firstClass.includes(':')) {
          hiddenElements.push(`.${firstClass}`);
        }
      }
    }
  }

  // Tenta remover os elementos ocultos identificados
  hiddenElements.forEach(selector => {
    try {
      clone.querySelectorAll(selector).forEach(el => el.remove());
    } catch {
      // Ignora seletores inválidos
    }
  });

  // Extrai e limpa o texto
  let text = clone.innerText || clone.textContent || "";
  
  // Limpeza de múltiplos espaços e quebras de linha duplicadas
  text = text
    .replace(/\r\n/g, '\n')
    .replace(/\n\s*\n+/g, '\n\n') // Reduz múltiplas linhas em branco a no máximo duas
    .replace(/[ \t]+/g, ' ')      // Reduz espaços horizontais duplicados
    .trim();

  // Se o texto extraído for muito curto (menos de 100 caracteres), cai de volta para o body completo sem limpeza agressiva
  if (text.length < 100 && rootElement !== document.body) {
    text = document.body.innerText || "";
    text = text.replace(/\n\s*\n+/g, '\n\n').replace(/[ \t]+/g, ' ').trim();
  }

  return {
    title: document.title,
    url: window.location.href,
    text: text.substring(0, 15000)
  };
})();
