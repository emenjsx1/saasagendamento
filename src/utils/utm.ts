/**
 * UTM Parameters Utilities
 * Captures and stores UTM parameters from URL
 */

export interface UTMParameters {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
}

/**
 * Captures UTM parameters from URL and stores in localStorage
 */
export const captureUTMParameters = (): UTMParameters => {
  const urlParams = new URLSearchParams(window.location.search);
  const utmData: UTMParameters = {
    utm_source: urlParams.get("utm_source") || null,
    utm_medium: urlParams.get("utm_medium") || null,
    utm_campaign: urlParams.get("utm_campaign") || null,
    utm_term: urlParams.get("utm_term") || null,
    utm_content: urlParams.get("utm_content") || null,
  };
  
  localStorage.setItem("utm_data", JSON.stringify(utmData));
  return utmData;
};

/**
 * Gets UTM parameters from localStorage
 */
export const getUTMParameters = (): UTMParameters => {
  try {
    const stored = localStorage.getItem("utm_data");
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (err) {
    console.warn("Erro ao ler UTM do localStorage:", err);
  }
  
  return {
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    utm_term: null,
    utm_content: null,
  };
};


