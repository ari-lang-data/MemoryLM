/**
 * Resolves template variables in a system prompt string.
 * Supported formats: {$char}, {{char}}, {$usr}, {{usr}}
 * 
 * @param {string} systemPrompt 
 * @param {object} charCard      — active model character card
 * @param {object} userCard      — active user character card (optional)
 * @returns {string}
 */
export function resolveTemplate(systemPrompt, charCard = null, userCard = null) {
  if (!systemPrompt) return systemPrompt;

  function buildCharBlock(card) {
    if (!card) return "themselves";
    const parts = [];
    if (card.name)          parts.push(`Name: ${card.name}`);
    if (card.appearance)    parts.push(`Appearance: ${card.appearance}`);
    if (card.behaviour)     parts.push(`Behaviour: ${card.behaviour}`);
    if (card.speech_pattern) parts.push(`Speech pattern: ${card.speech_pattern}`);
    if (card.background)    parts.push(`Background: ${card.background}`);
    return parts.join("\n");
  }

  const charBlock = buildCharBlock(charCard);
  const usrBlock  = buildCharBlock(userCard);

  return systemPrompt
    .replace(/\{\{char\}\}|\{\$char\}/gi, charBlock)
    .replace(/\{\{usr\}\}|\{\$usr\}/gi,  usrBlock);
}