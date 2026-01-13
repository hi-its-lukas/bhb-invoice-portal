import { IStorage } from "./storage";

interface GraphTokenCache {
  accessToken: string;
  expiresAt: number;
}

let tokenCache: GraphTokenCache | null = null;

export interface GraphEmailConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  fromAddress: string;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
}

async function getAccessToken(config: GraphEmailConfig): Promise<string> {
  const now = Date.now();
  
  if (tokenCache && tokenCache.expiresAt > now + 60000) {
    return tokenCache.accessToken;
  }
  
  const tokenUrl = `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`;
  
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });
  
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = "Token request failed";
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error_description || errorJson.error || errorMessage;
    } catch {
      errorMessage = errorText || errorMessage;
    }
    throw new Error(`OAuth-Fehler: ${errorMessage}`);
  }
  
  const data = await response.json();
  
  tokenCache = {
    accessToken: data.access_token,
    expiresAt: now + (data.expires_in * 1000),
  };
  
  return data.access_token;
}

export async function sendEmailViaGraph(
  config: GraphEmailConfig,
  params: SendEmailParams
): Promise<void> {
  const accessToken = await getAccessToken(config);
  
  const sendMailUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(config.fromAddress)}/sendMail`;
  
  const emailPayload = {
    message: {
      subject: params.subject,
      body: {
        contentType: "HTML",
        content: params.htmlBody,
      },
      toRecipients: [
        {
          emailAddress: {
            address: params.to,
          },
        },
      ],
    },
    saveToSentItems: true,
  };
  
  const response = await fetch(sendMailUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(emailPayload),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = "E-Mail-Versand fehlgeschlagen";
    try {
      const errorJson = JSON.parse(errorText);
      if (errorJson.error?.message) {
        errorMessage = errorJson.error.message;
      } else if (errorJson.error?.code) {
        errorMessage = `${errorJson.error.code}: ${errorJson.error.message || "Unbekannter Fehler"}`;
      }
    } catch {
      errorMessage = errorText || errorMessage;
    }
    throw new Error(`Graph API Fehler: ${errorMessage}`);
  }
}

export async function testGraphConnection(config: GraphEmailConfig): Promise<{ success: boolean; message: string }> {
  try {
    const accessToken = await getAccessToken(config);
    
    const meUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(config.fromAddress)}`;
    const response = await fetch(meUrl, {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = "Benutzer nicht gefunden oder keine Berechtigung";
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorMessage;
      } catch {
        // keep default message
      }
      return {
        success: false,
        message: errorMessage,
      };
    }
    
    const userData = await response.json();
    return {
      success: true,
      message: `Verbindung erfolgreich. Benutzer: ${userData.displayName || userData.mail || config.fromAddress}`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Verbindungsfehler",
    };
  }
}

export async function getGraphConfigFromStorage(storage: IStorage): Promise<GraphEmailConfig | null> {
  const [tenantId, clientId, clientSecret, fromAddress] = await Promise.all([
    storage.getSetting("GRAPH_TENANT_ID"),
    storage.getSetting("GRAPH_CLIENT_ID"),
    storage.getSetting("GRAPH_CLIENT_SECRET"),
    storage.getSetting("GRAPH_FROM_ADDRESS"),
  ]);
  
  if (!tenantId || !clientId || !clientSecret || !fromAddress) {
    return null;
  }
  
  return {
    tenantId,
    clientId,
    clientSecret,
    fromAddress,
  };
}

export function clearTokenCache(): void {
  tokenCache = null;
}
