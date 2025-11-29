/**
 * Carrega o Google Maps API dinamicamente
 */
export const loadGoogleMaps = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Verificar se já está carregado
    if (window.google && window.google.maps) {
      resolve();
      return;
    }

    // Verificar se já existe um script carregando
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      // Aguardar o script existente carregar
      const checkInterval = setInterval(() => {
        if (window.google && window.google.maps) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);

      // Timeout após 10 segundos
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!window.google || !window.google.maps) {
          reject(new Error('Google Maps não carregou a tempo'));
        }
      }, 10000);
      return;
    }

    // Criar e adicionar script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyDOoF7xxGJVZATKUbU5GnAsKc17EfS5pOw&libraries=places&loading=async&callback=initGoogleMaps`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      reject(new Error('Erro ao carregar Google Maps. Verifique se o billing está habilitado e as APIs estão ativadas.'));
    };

    // Criar callback global
    (window as any).initGoogleMaps = () => {
      // Verificar se houve erro de billing
      if (window.google && window.google.maps) {
        resolve();
      } else {
        reject(new Error('Google Maps carregou mas não está disponível. Verifique o billing.'));
      }
      delete (window as any).initGoogleMaps;
    };

    document.head.appendChild(script);
  });
};

