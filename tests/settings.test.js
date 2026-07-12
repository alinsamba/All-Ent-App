jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => '/mocked/userData'),
  },
}));

jest.mock('fs');

const fs = require('fs');
const { loadSettings, defaultSites } = require('../src/main/settings');
const state = require('../src/main/state');

describe('loadSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should catch JSON parsing errors and use default settings', () => {
    // Arrange
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue('{ malformed json }'); // This will cause JSON.parse to throw

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Act
    const loaded = loadSettings();

    // Assert
    expect(fs.existsSync).toHaveBeenCalledWith(expect.stringContaining('settings.json'));
    expect(fs.readFileSync).toHaveBeenCalledWith(expect.stringContaining('settings.json'), 'utf8');

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
    });

    // Verify state was correctly updated
    expect(state.settings).toEqual(loaded);
    expect(state.appVolume).toBe(1.0);

    // Cleanup
    consoleErrorSpy.mockRestore();
  });
});
