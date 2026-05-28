const OpenAI = require('openai');
const { aiProvider, aiTimeoutMs, ark, modelscope } = require('../config/env');

function resolveProviderConfig() {
  if (aiProvider === 'ark') {
    return {
      name: 'ark',
      apiKey: ark.apiKey,
      baseURL: ark.baseURL,
      model: ark.model,
    };
  }

  return {
    name: 'modelscope',
    apiKey: modelscope.apiKey,
    baseURL: modelscope.baseURL,
    model: modelscope.textModel,
  };
}

function createOpenAIClient() {
  const provider = resolveProviderConfig();

  if (!provider.apiKey) {
    return null;
  }

  return new OpenAI({
    apiKey: provider.apiKey,
    baseURL: provider.baseURL,
    timeout: aiTimeoutMs,
    maxRetries: 1,
  });
}

module.exports = {
  createOpenAIClient,
  resolveProviderConfig,
};
