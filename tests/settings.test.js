jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => '/mocked/userData'),
  },
}), { virtual: true });

jest.mock('fs');

const fs = require('fs');
const state = require('../src/main/state');
const { loadSettings, defaultSites } = require('../src/main/settings');

describe('loadSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should catch JSON parsing errors and use default settings', async () => {
    // Arrange
    fs.promises = {
      access: jest.fn().mockResolvedValue(undefined),
      readFile: jest.fn().mockResolvedValue('{ malformed json }')
    };

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Act
    const loaded = await loadSettings();

    // Assert
    expect(fs.promises.access).toHaveBeenCalledWith(expect.stringContaining('settings.json'));
    expect(fs.promises.readFile).toHaveBeenCalledWith(expect.stringContaining('settings.json'), 'utf8');

    // Verify console.error was called with the correct message
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error loading settings',
      expect.any(SyntaxError)
    );

    // Verify it returns default settings when JSON parsing fails
    expect(loaded).toEqual({
      extensions: [],
      sites: defaultSites,
      adBlockEnabled: true,
      pinnedExtensions: [],
      volume: 1.0,
      adblockRules: [],
      theme: 'pitch-black'
    });

    // Verify state was correctly updated
    expect(state.settings).toEqual(loaded);
    expect(state.appVolume).toBe(1.0);

    // Cleanup
    consoleErrorSpy.mockRestore();
  });
});
