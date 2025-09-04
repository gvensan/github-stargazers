#!/usr/bin/env node

const fs = require('fs');
const readline = require('readline');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function clearScreen() {
  console.clear();
}

function getTerminalSize() {
  // Get terminal dimensions, fallback to reasonable defaults
  const width = process.stdout.columns || 120;
  const height = process.stdout.rows || 30;
  return { width, height };
}

// Global frame state management
let currentFrame = null;
let frameWidth = null;
let frameHeight = null;

// Interactive mode flag
let isInteractive = false;

// Number of rounds
let numberOfRounds = 3;

function initializeFrame() {
  if (frameWidth && frameHeight) {
    // Frame already exists, just clear content
    clearFrameContent();
    return;
  }
  
  const terminalSize = getTerminalSize();
  frameWidth = terminalSize.width;
  frameHeight = terminalSize.height;
  
  // Clear screen and draw frame
  clearScreen();
  
  // Draw frame borders
  process.stdout.write('┌' + '─'.repeat(frameWidth - 2) + '┐\n');
  for (let i = 0; i < frameHeight - 2; i++) {
    process.stdout.write('│' + ' '.repeat(frameWidth - 2) + '│\n');
  }
  process.stdout.write('└' + '─'.repeat(frameWidth - 2) + '┘');
  
  // Move cursor to top-left of frame content area
  process.stdout.write(`\x1b[1;2H`);
  
  // Mark frame as initialized
  currentFrame = 'initialized';
}

function clearFrameContent() {
  // Clear only the content area, not the borders, with proper margins
  for (let y = 4; y < frameHeight - 2; y++) {
    process.stdout.write(`\x1b[${y};4H`);
    process.stdout.write(' '.repeat(frameWidth - 7)); // Account for 4 spaces on each side
  }
  // Move cursor back to top-left of content area
  process.stdout.write(`\x1b[4;4H`);
}

function writeInFrame(text, x = null, y = null, color = 'reset') {
  if (!frameWidth || !frameHeight) {
    initializeFrame();
  }
  
  // Ensure text doesn't exceed frame width with proper margins
  const maxTextWidth = frameWidth - 8; // 4 spaces margin on each side
  const displayText = text.length > maxTextWidth ? text.substring(0, maxTextWidth) : text;
  
  // If x is null, center the text horizontally
  let safeX;
  if (x === null) {
    const centerX = Math.floor((frameWidth - displayText.length) / 2);
    safeX = Math.max(4, Math.min(frameWidth - displayText.length - 3, centerX));
  } else {
    safeX = Math.max(4, Math.min(frameWidth - displayText.length - 3, x));
  }
  
  // Calculate safe Y coordinate with proper margins
  const safeY = Math.max(4, Math.min(frameHeight - 3, y || 4));
  
  // Position cursor and write text
  process.stdout.write(`\x1b[${safeY};${safeX}H`);
  process.stdout.write(`${colors[color]}${displayText}${colors.reset}`);
}

function centerTextInFrame(text, color = 'reset') {
  if (!frameWidth || !frameHeight) {
    initializeFrame();
  }
  
  const centerY = Math.floor(frameHeight / 2);
  writeInFrame(text, null, centerY, color); // null x will auto-center
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function waitForKeyPress(message = 'Press ENTER to continue...') {
  return new Promise((resolve) => {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    // Show message at bottom of frame with proper margin
    if (frameWidth && frameHeight) {
      const messageY = frameHeight - 3; // 2 spaces from bottom
      writeInFrame(message, null, messageY, 'cyan'); // null x will auto-center
    }
    
    rl.question('', () => {
      rl.close();
      resolve();
    });
  });
}

function waitForNextStage(message = '', delay = 800, forceKeyPress = false) {
  if (isInteractive || forceKeyPress) {
    return waitForKeyPress(message || 'Press ENTER to continue...');
  } else {
    // Only show meaningful messages, skip generic ones
    if (message && !message.includes('Continuing') && !message.includes('Preparing next round')) {
      if (frameWidth && frameHeight) {
        const messageY = frameHeight - 4; // 3 spaces from bottom
        writeInFrame(message, null, messageY, 'cyan'); // null x will auto-center
      }
    }
    return sleep(delay);
  }
}

function waitForExit(message = 'Press any key to continue...') {
  if (frameWidth && frameHeight) {
    const messageY = frameHeight - 3; // 2 spaces from bottom
    writeInFrame(message, null, messageY, 'cyan'); // null x will auto-center
    waitForKeyPress('');
  }
}

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function textToAsciiArt(text) {
  // Simple ASCII art mapping for uppercase letters and numbers
  const asciiMap = {
    'A': [' █████╗ ', '██╔══██╗', '███████║', '██╔══██║', '██║  ██║', '╚═╝  ╚═╝'],
    'B': ['██████╗ ', '██╔══██╗', '██████╔╝', '██╔══██╗', '██████╔╝', '╚═════╝ '],
    'C': [' ██████╗', '██╔════╝', '██║     ', '██║     ', '╚██████╗', ' ╚═════╝'],
    'D': ['██████╗ ', '██╔══██╗', '██║  ██║', '██║  ██║', '██████╔╝', '╚═════╝ '],
    'E': ['███████╗', '██╔════╝', '█████╗  ', '██╔══╝  ', '███████╗', '╚══════╝'],
    'F': ['███████╗', '██╔════╝', '█████╗  ', '██╔══╝  ', '██║     ', '╚═╝     '],
    'G': [' ██████╗ ', '██╔════╝ ', '██║  ███╗', '██║   ██║', '╚██████╔╝', ' ╚═════╝ '],
    'H': ['██╗  ██╗', '██║  ██║', '███████║', '██╔══██║', '██║  ██║', '╚═╝  ╚═╝'],
    'I': ['██╗', '██║', '██║', '██║', '██║', '╚═╝'],
    'J': ['     ██╗', '     ██║', '     ██║', '██╗  ██║', '╚█████╔╝', ' ╚════╝ '],
    'K': ['██╗  ██╗', '██║ ██╔╝', '█████╔╝ ', '██╔═██╗ ', '██║  ██╗', '╚═╝  ╚═╝'],
    'L': ['██╗     ', '██║     ', '██║     ', '██║     ', '███████╗', '╚══════╝'],
    'M': ['███╗   ███╗', '████╗ ████║', '██╔████╔██║', '██║╚██╔╝██║', '██║ ╚═╝ ██║', '╚═╝     ╚═╝'],
    'N': ['███╗   ██╗', '████╗  ██║', '██╔██╗ ██║', '██║╚██╗██║', '██║ ╚████║', '╚═╝  ╚═══╝'],
    'O': [' █████╗ ', '██╔══██╗', '██║  ██║', '██║  ██║', '╚█████╔╝', ' ╚════╝ '],
    'P': ['██████╗ ', '██╔══██╗', '██████╔╝', '██╔═══╝ ', '██║     ', '╚═╝     '],
    'Q': [' █████╗ ', '██╔══██╗', '██║  ██║', '██║ ╚██║', '╚█████╔╝', ' ╚═══██║'],
    'R': ['██████╗ ', '██╔══██╗', '██████╔╝', '██╔══██╗', '██║  ██║', '╚═╝  ╚═╝'],
    'S': [' ██████╗', '██╔════╝', '╚█████╗ ', ' ╚═══██╗', '██████╔╝', '╚═════╝ '],
    'T': ['████████╗', '╚══██╔══╝', '   ██║   ', '   ██║   ', '   ██║   ', '   ╚═╝   '],
    'U': ['██╗   ██╗', '██║   ██║', '██║   ██║', '██║   ██║', '╚██████╔╝', ' ╚═════╝ '],
    'V': ['██╗   ██╗', '██║   ██║', '██║   ██║', '╚██╗ ██╔╝', ' ╚████╔╝ ', '  ╚═══╝  '],
    'W': ['██╗    ██╗', '██║    ██║', '██║ █╗ ██║', '██║███╗██║', '╚███╔███╔╝', ' ╚══╝╚══╝ '],
    'X': ['██╗  ██╗', '╚██╗██╔╝', ' ╚███╔╝ ', ' ██╔██╗ ', '██╔╝ ██╗', '╚═╝  ╚═╝'],
    'Y': ['██╗   ██╗', '╚██╗ ██╔╝', ' ╚████╔╝ ', '  ╚██╔╝  ', '   ██║   ', '   ╚═╝   '],
    'Z': ['███████╗', '╚════██║', '    ██╔╝', '   ██╔╝ ', '  ██╔╝  ', ' ██╔╝   '],
    '0': [' █████╗ ', '██╔══██╗', '██║  ██║', '██║  ██║', '╚█████╔╝', ' ╚════╝ '],
    '1': [' ██╗', '███║', '╚██║', ' ██║', ' ██║', ' ╚═╝'],
    '2': ['██████╗ ', '╚════██╗', ' █████╔╝', '██╔═══╝ ', '███████╗', '╚══════╝'],
    '3': ['██████╗ ', '╚════██╗', ' █████╔╝', ' ╚═══██╗', '██████╔╝', '╚═════╝ '],
    '4': ['██╗  ██╗', '██║  ██║', '███████║', '╚════██║', '     ██║', '     ╚═╝'],
    '5': ['███████╗', '██╔════╝', '███████╗', '╚════██║', '███████║', '╚══════╝'],
    '6': [' ██████╗', '██╔════╝', '███████╗', '██╔══██║', '╚█████╔╝', ' ╚════╝ '],
    '7': ['███████╗', '╚════██║', '    ██╔╝', '   ██╔╝ ', '  ██╔╝  ', '  ╚═╝   '],
    '8': [' █████╗ ', '██╔══██╗', '╚█████╔╝', '██╔══██╗', '╚█████╔╝', ' ╚════╝ '],
    '9': [' █████╗ ', '██╔══██╗', '╚██████║', ' ╚═══██║', ' █████╔╝', ' ╚════╝ '],
    '-': ['        ', '        ', '████████', '        ', '        ', '        '],
    '_': ['        ', '        ', '        ', '        ', '        ', '████████'],
    '.': ['   ', '   ', '   ', '   ', '██╗', '╚═╝'],
    '!': ['██╗', '██║', '██║', '╚═╝', '██╗', '╚═╝'],
    '@': [' ██████╗ ', '██╔═══██╗', '██║ ██╔██║', '██║ ██╔██║', '╚██████╔╝ ', ' ╚═════╝  '],
    '#': [' ██╗ ██╗ ', '███████╗ ', ' ██╗ ██╗ ', '███████╗ ', ' ██╗ ██╗ ', ' ╚═╝ ╚═╝ '],
    '$': [' ██████╗', '██╔════╝', '╚█████╗ ', ' ╚═══██╗', '██████╔╝', '╚═════╝ '],
    '%': ['██╗  ██╗', '╚██╗██╔╝', ' ╚███╔╝ ', ' ██╔██╗ ', '██╔╝ ██╗', '╚═╝  ╚═╝'],
    '^': [' ██╗██╗ ', '╚═╝╚═╝  ', '        ', '        ', '        ', '        '],
    '&': [' █████╗ ', '██╔══██╗', ' █████╔╝', '██╔══██╗', '╚█████╔╝', ' ╚════╝ '],
    '*': [' ██╗██╗ ', '╚═╝╚═╝  ', ' ██╗██╗ ', '╚═╝╚═╝  ', '        ', '        '],
    '(': [' ██╗', '██╔╝', '██║ ', '██║ ', '██╔╝', ' ╚═╝'],
    ')': ['██╗ ', '╚██╗', ' ██║', ' ██║', '╚██╗', ' ╚═╝'],
    '+': ['       ', '  ██╗  ', '██████╗', '  ██╗  ', '       ', '       '],
    '=': ['       ', '███████', '       ', '███████', '       ', '       '],
    '[': ['███╗', '██║ ', '██║ ', '██║ ', '██║ ', '███╗'],
    ']': ['███╗', ' ██║', ' ██║', ' ██║', ' ██║', '███╗'],
    '{': [' ███╗', '██╔╝ ', '██║  ', '██║  ', '██╚╗ ', ' ███╗'],
    '}': ['███╗ ', ' ╚██╗', '  ██║', '  ██║', ' ██╔╝', '███╗ '],
    '|': ['██╗', '██║', '██║', '██║', '██║', '╚═╝'],
    '\\': ['██╗   ', '╚██╗  ', ' ╚██╗ ', '  ╚██╗', '   ╚██╗', '    ╚═╝'],
    '/': ['   ██╗', '  ██╔╝', ' ██╔╝ ', '██╔╝  ', '╚═╝   ', '      '],
    '<': ['  ██╗', ' ██╔╝', '██╔╝ ', '██╚╗ ', ' ██╚╗', '  ╚═╝'],
    '>': ['██╗  ', '╚██╗ ', ' ╚██╗', ' ██╔╝', '██╔╝ ', '╚═╝  '],
    '?': ['██████╗ ', '╚════██╗', '  ███╔╝ ', '  ╚═╝   ', '  ██╗   ', '  ╚═╝   '],
    '~': ['        ', ' ██╗ ██╗', '╚═╝ ╚═╝ ', '        ', '        ', '        '],
    '`': ['██╗', '╚██╗', ' ╚═╝', '    ', '    ', '    '],
    ' ': ['        ', '        ', '        ', '        ', '        ', '        ']
  };

  const lines = ['', '', '', '', '', ''];
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    // Try exact character first, then uppercase, then lowercase, then space
    let asciiChar = asciiMap[char] || asciiMap[char.toUpperCase()] || asciiMap[char.toLowerCase()] || asciiMap[' '];
    
    for (let j = 0; j < 6; j++) {
      lines[j] += asciiChar[j];
    }
  }
  
  return lines;
}

function getAdaptiveAsciiArt(text) {
  if (!frameWidth || !frameHeight) {
    initializeFrame();
  }
  
  // Calculate available width (frame width minus margins)
  const availableWidth = frameWidth - 8; // 4 spaces margin on each side
  
  // First try with full ASCII art
  let asciiLines = textToAsciiArt(text);
  const maxLineLength = Math.max(...asciiLines.map(line => line.length));
  
  // If it fits, return the full ASCII art
  if (maxLineLength <= availableWidth) {
    return asciiLines;
  }
  
  // If it doesn't fit, try smaller version
  let smallAsciiLines = createSmallAsciiArt(text, availableWidth);
  const smallMaxLineLength = Math.max(...smallAsciiLines.map(line => line.length));
  
  // If small version fits, return it
  if (smallMaxLineLength <= availableWidth) {
    return smallAsciiLines;
  }
  
  // If even small version doesn't fit, split the name into multiple lines
  return createMultiLineAsciiArt(text, availableWidth);
}

function createSmallAsciiArt(text, maxWidth) {
  // Simple ASCII art using basic characters for better compatibility
  const smallAsciiMap = {
    'A': ['  A  ', ' A A ', 'AAAAA', 'A   A', 'A   A'],
    'B': ['BBBB ', 'B   B', 'BBBB ', 'B   B', 'BBBB '],
    'C': [' CCCC', 'C    ', 'C    ', 'C    ', ' CCCC'],
    'D': ['DDDD ', 'D   D', 'D   D', 'D   D', 'DDDD '],
    'E': ['EEEEE', 'E    ', 'EEEE ', 'E    ', 'EEEEE'],
    'F': ['FFFFF', 'F    ', 'FFFF ', 'F    ', 'F    '],
    'G': [' GGG ', 'G    ', 'G  GG', 'G   G', ' GGG '],
    'H': ['H   H', 'H   H', 'HHHHH', 'H   H', 'H   H'],
    'I': ['IIIII', '  I  ', '  I  ', '  I  ', 'IIIII'],
    'J': ['JJJJJ', '   J ', '   J ', 'J  J ', ' JJ  '],
    'K': ['K   K', 'K  K ', 'KKK  ', 'K  K ', 'K   K'],
    'L': ['L    ', 'L    ', 'L    ', 'L    ', 'LLLLL'],
    'M': ['M   M', 'MM MM', 'M M M', 'M   M', 'M   M'],
    'N': ['N   N', 'NN  N', 'N N N', 'N  NN', 'N   N'],
    'O': [' OOO ', 'O   O', 'O   O', 'O   O', ' OOO '],
    'P': ['PPPP ', 'P   P', 'PPPP ', 'P    ', 'P    '],
    'Q': [' QQQ ', 'Q   Q', 'Q Q Q', 'Q  Q ', ' QQQQ'],
    'R': ['RRRR ', 'R   R', 'RRRR ', 'R  R ', 'R   R'],
    'S': [' SSSS', 'S    ', ' SSS ', '    S', 'SSSS '],
    'T': ['TTTTT', '  T  ', '  T  ', '  T  ', '  T  '],
    'U': ['U   U', 'U   U', 'U   U', 'U   U', ' UUU '],
    'V': ['V   V', 'V   V', 'V   V', ' V V ', '  V  '],
    'W': ['W   W', 'W   W', 'W W W', 'WW WW', 'W   W'],
    'X': ['X   X', ' X X ', '  X  ', ' X X ', 'X   X'],
    'Y': ['Y   Y', ' Y Y ', '  Y  ', '  Y  ', '  Y  '],
    'Z': ['ZZZZZ', '   Z ', '  Z  ', ' Z   ', 'ZZZZZ'],
    'a': ['     ', ' AAA ', 'A   A', 'AAAAA', 'A   A'],
    'b': ['B    ', 'BBBB ', 'B   B', 'B   B', 'BBBB '],
    'c': ['     ', ' CCCC', 'C    ', 'C    ', ' CCCC'],
    'd': ['   D ', ' DDDD', 'D   D', 'D   D', ' DDDD'],
    'e': ['     ', ' EEEE', 'EEEEE', 'E    ', ' EEEE'],
    'f': ['  FFF', 'F    ', 'FFFF ', 'F    ', 'F    '],
    'g': ['     ', ' GGGG', 'G   G', ' GGGG', '   G '],
    'h': ['H    ', 'HHHH ', 'H   H', 'H   H', 'H   H'],
    'i': ['  I  ', '     ', ' III ', '  I  ', ' III '],
    'j': ['   J ', '     ', ' JJJ ', '   J ', ' JJ  '],
    'k': ['K    ', 'K  K ', 'KKK  ', 'K  K ', 'K   K'],
    'l': [' LLL ', '  L  ', '  L  ', '  L  ', ' LLL '],
    'm': ['     ', 'M M M', 'M M M', 'M   M', 'M   M'],
    'n': ['     ', 'NNNN ', 'N   N', 'N   N', 'N   N'],
    'o': ['     ', ' OOO ', 'O   O', 'O   O', ' OOO '],
    'p': ['     ', 'PPPP ', 'P   P', 'PPPP ', 'P    '],
    'q': ['     ', ' QQQQ', 'Q   Q', ' QQQQ', '   Q '],
    'r': ['     ', 'RRRR ', 'R   R', 'R    ', 'R    '],
    's': ['     ', ' SSSS', ' SSS ', '    S', 'SSSS '],
    't': [' TTT ', 'TTTTT', '  T  ', '  T  ', '  TT '],
    'u': ['     ', 'U   U', 'U   U', 'U   U', ' UUUU'],
    'v': ['     ', 'V   V', 'V   V', ' V V ', '  V  '],
    'w': ['     ', 'W   W', 'W W W', 'WW WW', 'W   W'],
    'x': ['     ', 'X   X', ' X X ', ' X X ', 'X   X'],
    'y': ['     ', 'Y   Y', ' Y Y ', '  Y  ', ' Y   '],
    'z': ['     ', 'ZZZZZ', '  Z  ', ' Z   ', 'ZZZZZ'],
    '0': [' 00 ', '0  0', '0  0', '0  0', ' 00 '],
    '1': [' 1  ', '11  ', ' 1  ', ' 1  ', '111 '],
    '2': [' 22 ', '   2', ' 22 ', '2   ', '2222'],
    '3': [' 33 ', '   3', ' 33 ', '   3', ' 33 '],
    '4': ['4  4', '4  4', '4444', '   4', '   4'],
    '5': ['5555', '5   ', ' 555 ', '   5', ' 55 '],
    '6': [' 66 ', '6   ', ' 66 ', '6  6', ' 66 '],
    '7': ['7777', '   7', '  7 ', ' 7  ', '7   '],
    '8': [' 88 ', '8  8', ' 88 ', '8  8', ' 88 '],
    '9': [' 99 ', '9  9', ' 999', '   9', ' 99 '],
    '-': ['    ', '    ', '----', '    ', '    '],
    '_': ['    ', '    ', '    ', '    ', '____'],
    '.': ['    ', '    ', '    ', '    ', ' .  '],
    '!': [' !  ', ' !  ', ' !  ', '    ', ' !  '],
    '@': [' @@ ', '@  @', '@ @@', '@  @', ' @@ '],
    '#': [' # #', '####', ' # #', '####', ' # #'],
    '$': [' $$$', ' $  ', ' $$ ', '   $', '$$$ '],
    '%': ['%  %', '  % ', ' %  ', ' %  ', '%  %'],
    '^': [' ^  ', '^ ^ ', '    ', '    ', '    '],
    '&': [' && ', '&  &', ' && ', '&  &', ' &&&'],
    '*': ['* * ', ' *  ', '* * ', '    ', '    '],
    '(': ['  ( ', ' (  ', ' (  ', ' (  ', '  ( '],
    ')': [' )  ', '  ) ', '  ) ', '  ) ', ' )  '],
    '+': ['    ', ' +  ', '+++ ', ' +  ', '    '],
    '=': ['    ', ' ===', '    ', ' ===', '    '],
    '[': ['[[[ ', '[   ', '[   ', '[   ', '[[[ '],
    ']': [' ]]]', '   ]', '   ]', '   ]', ' ]]]'],
    '{': ['  {{', ' {  ', '{{  ', ' {  ', '  {{'],
    '}': ['}}  ', '  } ', '  }}', '  } ', '}}  '],
    '|': [' |  ', ' |  ', ' |  ', ' |  ', ' |  '],
    '\\': ['\\   ', ' \\  ', '  \\ ', '   \\', '    '],
    '/': ['   /', '  / ', ' /  ', '/   ', '    '],
    '<': ['  < ', ' <  ', '<   ', ' <  ', '  < '],
    '>': [' >  ', '  > ', '   >', '  > ', ' >  '],
    '?': [' ?? ', '   ?', '  ? ', ' ?  ', ' ?  '],
    '~': ['    ', ' ~ ~', '~   ', '    ', '    '],
    '`': [' `  ', '  ` ', '    ', '    ', '    '],
    '"': ['" " ', '" " ', '    ', '    ', '    '],
    "'": [' \'  ', ' \'  ', '    ', '    ', '    '],
    ':': ['    ', ' :  ', '    ', ' :  ', '    '],
    ';': ['    ', ' :  ', '    ', ' :  ', ' :  '],
    ',': ['    ', '    ', '    ', ' ,  ', ' ,  '],
    ' ': ['    ', '    ', '    ', '    ', '    '],
  };

  const lines = ['', '', '', '', ''];
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    // Try exact character first, then uppercase, then lowercase, then space
    let asciiChar = smallAsciiMap[char] || smallAsciiMap[char.toUpperCase()] || smallAsciiMap[char.toLowerCase()] || smallAsciiMap[' '];
    
    for (let j = 0; j < 5; j++) {
      lines[j] += asciiChar[j];
    }
  }
  
  return lines;
}

function createMultiLineAsciiArt(text, maxWidth) {
  // Calculate optimal characters per line based on available width
  const charsPerLine = 8 // Each character is 5 chars wide in small ASCII
  
  // Simple word splitting by spaces first
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const chunks = [];
  let currentChunk = '';
  
  for (const word of words) {
    // If adding this word would exceed the limit, start a new chunk
    if (currentChunk.length + word.length + 1 > charsPerLine && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = word;
    } else {
      currentChunk += (currentChunk.length > 0 ? ' ' : '') + word;
    }
  }
  
  // Add the last chunk if it's not empty
  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }
  
  // If we still have chunks that are too long, split them by character count
  const finalChunks = [];
  for (const chunk of chunks) {
    if (chunk.length <= charsPerLine) {
      finalChunks.push(chunk);
    } else {
      // Split long chunks by character count
      for (let i = 0; i < chunk.length; i += charsPerLine) {
        finalChunks.push(chunk.substring(i, i + charsPerLine));
      }
    }
  }
  
  // Create ASCII art for each chunk
  const allLines = [];
  finalChunks.forEach((chunk, chunkIndex) => {
    const chunkLines = createSmallAsciiArt(chunk, maxWidth);
    allLines.push(...chunkLines);
    
    // Add spacing between chunks (except for the last one)
    if (chunkIndex < finalChunks.length - 1) {
      allLines.push(''); // Empty line between chunks
    }
  });
  
  return allLines;
}

async function animateSpinner(duration = 1500) {
  const spinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  const startTime = Date.now();
  let i = 0;
  
  while (Date.now() - startTime < duration) {
    const spinnerText = `${spinner[i]} Spinning the wheel...`;
    writeInFrame(spinnerText, null, 10, 'cyan');
    await sleep(100);
    i = (i + 1) % spinner.length;
  }
}



async function showCyberpunkConfetti(winnerName = null) {
  const cyberChars = ['⚡', '💎', '🔮', '✨', '🌟', '💫', '⭐', '🔺', '🔻', '◊', '◆', '◇'];
  
  initializeFrame();
  
  for (let frame = 0; frame < 8; frame++) {
    clearFrameContent();
    
    // Add cyberpunk confetti inside frame
    for (let y = 4; y < frameHeight - 2; y++) {
      for (let x = 4; x < frameWidth - 2; x++) {
        if (Math.random() < 0.15) {
          const char = cyberChars[Math.floor(Math.random() * cyberChars.length)];
          writeInFrame(char, x, y, 'magenta');
        }
      }
    }
    
    // Show winner name in the center of confetti if provided
    if (winnerName && frame >= 3) {
      const winnerText = `🏆 ${winnerName.toUpperCase()} 🏆`;
      writeInFrame(winnerText, null, Math.floor(frameHeight / 2), 'bright');
    }
    
    await sleep(100);
  }
}

async function showFireworks() {
  const fireworkChars = ['💥', '✨', '🌟', '💫', '⭐', '🎆', '🎇'];
  const positions = [20, 30, 40, 50, 60];
  
  for (let burst = 0; burst < 5; burst++) {
    initializeFrame();
    
    for (let line = 0; line < 15; line++) {
      let displayLine = '';
      for (let col = 0; col < 80; col++) {
        if (Math.random() < 0.05) {
          displayLine += fireworkChars[Math.floor(Math.random() * fireworkChars.length)];
        } else {
          displayLine += ' ';
        }
      }
      writeInFrame(displayLine, null, line + 4, 'yellow');
    }
    await sleep(300);
  }
}

async function showCyberpunkWheel(candidates, round) {
  const wheelChars = ['◐', '◓', '◑', '◒'];
  const cyberChars = ['⚡', '💎', '🔮', '◆', '◇', '◊'];
  
  initializeFrame();
  
  const centerX = Math.floor(frameWidth / 2);
  const centerY = Math.floor(frameHeight / 2);
  const radius = Math.min(6, Math.floor(Math.min(frameWidth, frameHeight) / 6));
  
  for (let spin = 0; spin < 15; spin++) {
    clearFrameContent();
    
    // Draw cyberpunk wheel inside frame
    for (let y = 4; y < frameHeight - 2; y++) {
      for (let x = 4; x < frameWidth - 2; x++) {
        const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        if (Math.abs(distance - radius) < 1.5) {
          writeInFrame(wheelChars[spin % 4], x, y, 'magenta');
        } else if (distance < radius && Math.random() < 0.2) {
          const char = cyberChars[Math.floor(Math.random() * cyberChars.length)];
          writeInFrame(char, x, y, 'blue');
        }
      }
    }
    
    // Show round info
    const roundText = `⚡ ROUND ${round} - CYBERPUNK RAFFLE SCAN ⚡`;
    const textY = frameHeight - 3;
    writeInFrame(roundText, null, textY, 'bright');
    
    await sleep(150);
  }
}

async function showCyberpunkElimination(candidates, round, eliminatedCount, winner) {
  // Cyberpunk elimination messages
  const eliminationMessages = [
    `⚡ ELIMINATING ${eliminatedCount} TARGETS... ⚡`,
    `🔮 ROUND ${round} - NEURAL SCAN ACTIVE! 🔮`,
    `💎 NARROWING DOWN THE DATABASE... 💎`,
    `◆ FOCUSING ON THE ELITE CONTENDERS... ◆`,
    `🏆 THE FINAL CYBER SHOWDOWN! 🏆`
  ];
  
  const message = eliminationMessages[round - 1] || eliminationMessages[4];
  
  // Animate the message in frame
  for (let i = 0; i < 3; i++) {
    initializeFrame();
    centerTextInFrame(message, 'bright');
    await sleep(500);
  }
  
  // Show elimination summary (no names in intermediate stages)
  initializeFrame();
  
  // Show elimination count
  const eliminationText = `🎯 ${eliminatedCount} TARGETS ELIMINATED`;
  writeInFrame(eliminationText, null, 6, 'red');
  
  // Show remaining count
  const remainingText = `🔮 ${candidates.length} TARGETS REMAINING`;
  writeInFrame(remainingText, null, 8, 'green');
  
  // Show progress bar
  const progressText = `⚡ ROUND ${round} COMPLETE ⚡`;
  writeInFrame(progressText, null, 10, 'yellow');
  
  await sleep(1000);
}

async function showSuspenseBuildUp(round) {
  const suspenseMessages = [
    "🎪 The crowd is getting restless...",
    "⚡ Tension is building in the air...",
    "🔥 The stakes are getting higher...",
    "💎 Only the worthy shall remain...",
    "🏆 This is it... the moment of truth!"
  ];
  
  const message = suspenseMessages[round - 1] || suspenseMessages[4];
  
  // Show suspense message in frame
  initializeFrame();
  writeInFrame(message, null, 6, 'magenta');
  
  // Animate dots
  let dots = '';
  for (let i = 0; i < 5; i++) {
    dots += '.';
    writeInFrame(dots, null, 8, 'magenta');
    await sleep(200);
  }
}

async function animateWinnerSelection(candidates, winner) {
  // Start the raffle
  await waitForNextStage('Starting the raffle...', 1200);
  
  // Show title in frame
  initializeFrame();
  const titleText = '🔮 CYBERPUNK RAFFLE SYSTEM 🔮';
  centerTextInFrame(titleText, 'bright');
  
  await waitForNextStage('Beginning neural scan...', 1000);
  
  // Configurable rounds of increasing drama with proportional eliminations
  let currentCandidates = [...candidates];
  const totalRounds = numberOfRounds;
  const totalParticipants = candidates.length;
  
  for (let round = 0; round < totalRounds; round++) {
    const roundNumber = round + 1;
    
    // Calculate proportional elimination for this round
    // Each round eliminates a portion, leaving some for the final round
    const remainingRounds = totalRounds - round;
    const eliminationRatio = round < totalRounds - 1 ? 0.3 : 0; // 30% each round except last
    const eliminatedCount = round < totalRounds - 1 ? Math.floor(currentCandidates.length * eliminationRatio) : 0;
    
    // Show cyberpunk wheel for first 3 rounds
    if (round < 3) {
      await showCyberpunkWheel(currentCandidates, roundNumber);
      await waitForNextStage('', 800);
    }
    
    // Show suspense buildup
    await showSuspenseBuildUp(roundNumber);
    await waitForNextStage('Analyzing results...', 1000);
    
    // Show elimination round
    await showCyberpunkElimination(currentCandidates, roundNumber, eliminatedCount, winner);
    
    // Update candidates for next round
    if (eliminatedCount > 0) {
      const shuffled = shuffleArray(currentCandidates);
      currentCandidates = shuffled.slice(eliminatedCount);
    }
    
    // Wait between rounds
    if (round < totalRounds - 1) {
      await waitForNextStage('', 1000);
    }
  }
  
  // Final countdown in frame
  initializeFrame();
  const countdownText = '⚡ FINAL COUNTDOWN TO VICTORY! ⚡';
  writeInFrame(countdownText, null, 6, 'bright'); // Position message at specific location
  
  for (let i = 3; i > 0; i--) {
    const numberText = `${i}`;
    writeInFrame(numberText, null, 10, 'yellow'); // Position countdown below message
  await sleep(1000);
  }
  
  await waitForNextStage('Preparing final reveal...', 500);
  
  // Final pause to show the winner
  await waitForNextStage('🎉 WINNER IDENTIFIED! 🎉', 1000);
  
  // Show confetti immediately after winner is identified
  await showCyberpunkConfetti();
  
  // Show winner in large ASCII art
  initializeFrame();
  const winnerTitle = '🏆 CYBERPUNK RAFFLE CHAMPION 🏆';
  writeInFrame(winnerTitle, null, 2, 'bright');
  
  // Split winner name into multiple lines if needed
  const maxCharsPerLine = 12; // Maximum characters per line for ASCII art
  const winnerWords = winner.split(' ');
  const winnerLines = [];
  let currentLine = '';
  
  for (const word of winnerWords) {
    if (currentLine.length + word.length + 1 <= maxCharsPerLine) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      if (currentLine) {
        winnerLines.push(currentLine);
        currentLine = word;
      } else {
        // Word is too long, split it
        winnerLines.push(word.substring(0, maxCharsPerLine));
        currentLine = word.substring(maxCharsPerLine);
      }
    }
  }
  if (currentLine) {
    winnerLines.push(currentLine);
  }
  
  // Create ASCII art for each line
  const allAsciiLines = [];
  for (const line of winnerLines) {
    const asciiLines = getAdaptiveAsciiArt(line);
    allAsciiLines.push(...asciiLines);
    allAsciiLines.push(''); // Add spacing between words
  }
  
  // Calculate starting position to center the ASCII art vertically
  const totalAsciiLines = allAsciiLines.filter(line => line.trim() !== '').length;
  const availableHeight = frameHeight - 6; // Leave space for title and bottom
  const startY = Math.max(4, Math.floor((availableHeight - totalAsciiLines) / 2) + 2);
  
  let asciiY = startY;
  for (let i = 0; i < allAsciiLines.length; i++) {
    const line = allAsciiLines[i];
    if (line.trim() === '') {
      // Skip empty lines (spacing between multi-line chunks)
      asciiY++;
      continue;
    }
    writeInFrame(line, null, asciiY, 'bright');
    asciiY++;
  }
  
  // Final celebration
  await waitForNextStage('🎊 CONGRATULATIONS! 🎊', 1000);
  waitForExit();

  await waitForNextStage('', 1000, true);
}

async function showWelcomeAnimation() {
  const welcomeText = [
    "🔮 WELCOME TO THE CYBERPUNK RAFFLE SYSTEM! 🔮",
    "🎲 YOUR LUCK IS NOW QUANTUM! 🎲",
    // "💎 PREPARE FOR THE ULTIMATE SCAN! 💎",
    // "🕶️ ENTER THE GRID OF DESTINY! 🕶️",
    // "⚔️ HACK THE ODDS, CLAIM YOUR PRIZE! ⚔️",
    // "🔥 THE CIRCUIT DECIDES YOUR FUTURE! 🔥",
    // "🌌 STEP INTO THE DIGITAL ARENA OF FATE! 🌌",
    // "💿 WHERE CODE TURNS INTO TREASURE! 💿",
    // "🧬 RANDOMNESS REWIRED, FORTUNE UNLOCKED! 🧬",
    // "⚡ SPIN THE NEON WHEEL OF CHANCE! ⚡",
    // "🔗 JACK INTO THE LOTTERY MAINFRAME! 🔗",
    // "🚀 UPGRADE YOUR REALITY, ONE DRAW AT A TIME! 🚀",
  ];
  
  for (let i = 0; i < welcomeText.length; i++) {
    initializeFrame();
    centerTextInFrame(welcomeText[i], 'bright');
    await sleep(1500);
  }
}

async function displayStats(totalParticipants, remainingParticipants, previousWinners) {
  await showWelcomeAnimation();
  
  initializeFrame();
  
  // Show statistics in frame
  writeInFrame('📊 RAFFLE STATISTICS', null, 3, 'bright');
  writeInFrame(`📈 Total Participants: ${totalParticipants}`, null, 5, 'cyan');
  writeInFrame(`🎯 Remaining Participants: ${remainingParticipants}`, null, 6, 'green');
  writeInFrame(`🏆 Previous Winners: ${previousWinners.length}`, null, 7, 'yellow');
  
  if (previousWinners.length > 0) {
    writeInFrame('🏅 Previous Winners:', null, 9, 'yellow');
    let yPos = 11;
    const displayCount = Math.min(8, previousWinners.length);
    for (let i = 0; i < displayCount; i++) {
      writeInFrame(`${i + 1}. ${previousWinners[i]}`, null, yPos, 'white');
      yPos++;
    }
    if (previousWinners.length > displayCount) {
      writeInFrame(`... and ${previousWinners.length - displayCount} more`, null, yPos, 'white');
    }
  }
  
  if (remainingParticipants === 0) {
    writeInFrame('🎊 ALL PARTICIPANTS HAVE WON! 🎊', null, frameHeight - 4, 'bright');
    writeInFrame('Time to reset the raffle!', null, frameHeight - 3, 'cyan');
  }
}

function formatReadableDate(date = new Date()) {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

async function loadFullWinners(filename = 'raffle-winners.json') {
  try {
    if (fs.existsSync(filename)) {
      const data = JSON.parse(fs.readFileSync(filename, 'utf8'));
      return data.winners || [];
    }
  } catch (error) {
    console.error(`Could not load full winners data: ${error.message}`);
  }
  return [];
}

async function saveWinners(newWinnerName, filename = 'raffle-winners.json') {
  try {
    const currentDate = formatReadableDate();
    
    // Load existing winners
    const existingWinners = await loadFullWinners(filename);
    
    // Add new winner with name and date
    const newWinner = {
      name: newWinnerName,
      date: currentDate
    };
    
    const allWinners = [...existingWinners, newWinner];
    
    const data = {
      winners: allWinners,
      total_winners: allWinners.length,
      last_updated: currentDate
    };
    
    fs.writeFileSync(filename, JSON.stringify(data, null, 2));
    // Message will be displayed in frame context instead
  } catch (error) {
    // Error will be handled in frame context
    console.error(`Error saving winners: ${error.message}`);
  }
}

async function resetWinners(filename = 'raffle-winners.json') {
  try {
    const currentDate = formatReadableDate();
    const data = {
      winners: [],
      total_winners: 0,
      last_updated: currentDate
    };
    fs.writeFileSync(filename, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Error resetting winners: ${error.message}`);
  }
}

async function loadWinners(filename = 'raffle-winners.json') {
  try {
    if (fs.existsSync(filename)) {
      const data = JSON.parse(fs.readFileSync(filename, 'utf8'));
      const winners = data.winners || [];
      
      // Handle both old format (array of strings) and new format (array of objects)
      if (winners.length > 0 && typeof winners[0] === 'object' && winners[0].name) {
        // New format: return just the names for backward compatibility
        return winners.map(winner => winner.name);
      } else {
        // Old format: return as is
        return winners;
      }
    }
  } catch (error) {
    // Error will be handled in frame context
    console.error(`Could not load previous winners: ${error.message}`);
  }
  return [];
}

function loadParticipants(filename) {
  try {
    if (!fs.existsSync(filename)) {
      throw new Error(`File not found: ${filename}`);
    }
    
    const content = fs.readFileSync(filename, 'utf8');
    const participants = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    if (participants.length === 0) {
      throw new Error('No participants found in file');
    }
    
    return participants;
  } catch (error) {
    console.error(`Error loading participants: ${error.message}`);
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    log('🎰 Interactive Raffle Winner Picker', 'bright');
    log('=' .repeat(60), 'blue');
    log('\nUsage: node raffle-winner.js <participants-file> [options]', 'cyan');
    log('Example: node raffle-winner.js participants.txt', 'cyan');
    log('Example: node raffle-winner.js participants.txt -interactive', 'cyan');
    log('Example: node raffle-winner.js participants.txt -rounds 5', 'cyan');
    log('Options:', 'yellow');
    log('  -interactive    Wait for key press between stages', 'yellow');
    log('  -rounds N       Number of rounds (default: 3)', 'yellow');
    log('\nThe participants file should contain one name per line.', 'yellow');
    process.exit(0);
  }
  
  // Check for interactive mode flag
  isInteractive = args.includes('-interactive');
  
  // Check for rounds parameter
  const roundsIndex = args.findIndex(arg => arg === '-rounds');
  if (roundsIndex !== -1 && roundsIndex + 1 < args.length) {
    const roundsValue = parseInt(args[roundsIndex + 1]);
    if (!isNaN(roundsValue) && roundsValue > 0) {
      numberOfRounds = roundsValue;
    } else {
      log('❌ Invalid rounds value. Using default of 3.', 'red');
    }
  }
  
  // Remove flags from args to get filename
  const participantsFile = args.filter(arg => 
    !arg.startsWith('-') && 
    arg !== numberOfRounds.toString() && 
    arg !== '-rounds' && 
    arg !== '-interactive'
  )[0] || 'participants.txt';
  
  // Show mode indicator
  log('🎲 CYBERPUNK RAFFLE SYSTEM 🎲', 'bright');
  log('=' .repeat(50), 'blue');
  
  if (isInteractive) {
    log('🎮 Interactive Mode: Press ENTER to advance stages', 'cyan');
  } else {
    log('⚡ Auto Mode: Automatic progression with delays', 'green');
  }
  log(`🎯 Number of Rounds: ${numberOfRounds}`, 'yellow');
  log('');
  
  // Load participants and previous winners
  const allParticipants = loadParticipants(participantsFile);
  const previousWinners = await loadWinners();
  
  log(`📁 Participants file: ${participantsFile}`, 'cyan');
  log(`👥 Total participants: ${allParticipants.length}`, 'green');
  log(`🏆 Previous winners: ${previousWinners.length}`, 'yellow');
  
  // Calculate remaining participants
  const remainingParticipants = allParticipants.filter(
    participant => !previousWinners.includes(participant)
  );
  
  if (remainingParticipants.length === 0) {
    log('\n🎊 ALL PARTICIPANTS HAVE ALREADY WON! 🎊', 'bright');
    log('Would you like to reset the raffle? (y/n)', 'cyan');
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question('> ', async (answer) => {
      rl.close();
      if (answer.toLowerCase().trim() === 'y') {
        // Reset winners
        await resetWinners();
        log('🔄 Raffle reset! All participants are eligible again.', 'green');
        process.exit(0);
      } else {
        log('👋 Goodbye!', 'cyan');
        process.exit(0);
      }
    });
    return;
  }
  
  let round = 1;
  
  while (true) {
    clearScreen();
    
    // Display current stats
    await displayStats(allParticipants.length, remainingParticipants.length, previousWinners);
    
    // Show round information in frame
    initializeFrame();
    const roundText = `🎲 ROUND ${round} 🎲`;
    writeInFrame(roundText, null, 6, 'bright');
    
    // Show dramatic round introduction
    const roundMessages = [
      "🎪 Round 1: The Beginning of Legends!",
      "⚡ Round 2: The Heat is Rising!",
      "🔥 Round 3: The Stakes are High!",
      "💎 Round 4: The Elite Few Remain!",
      "🏆 Round 5: The Final Showdown!"
    ];
    
    const message = roundMessages[round - 1] || roundMessages[4];
    writeInFrame(message, null, 8, 'magenta');
    
    // Animate winner selection
    await animateSpinner(1000);
    
    // Pick winner
    let winner = getRandomElement(remainingParticipants);
    // Animate the selection process
    await animateWinnerSelection(remainingParticipants, winner);
    
    // Update winners list
    previousWinners.push(winner);
    await saveWinners(winner);
    
    // Clear screen for clean final display
    clearScreen();
    
    // Show final result with clean formatting
    log('\n' + '='.repeat(60), 'blue');
    log(`🎉 Winner selected: ${winner}`, 'bright');
    log('💾 Winner saved to raffle-winners.json', 'green');
    log('='.repeat(60), 'blue');
    log('\n👋 Raffle complete! Goodbye!', 'cyan');
    process.exit(0);
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  clearScreen();
  log('\n' + '='.repeat(60), 'blue');
  log('👋 Raffle interrupted. Goodbye!', 'cyan');
  log('='.repeat(60), 'blue');
  process.exit(0);
});

// Run the script
if (require.main === module) {
  main().catch(error => {
    clearScreen();
    log('\n' + '='.repeat(60), 'red');
    log(`❌ Unexpected error: ${error.message}`, 'red');
    log('='.repeat(60), 'red');
    process.exit(1);
  });
}
