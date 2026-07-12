jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => '/mocked/userData'),
  },
}), { virtual: true });

jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
    readFile: jest.fn()
  }
}));

const fs = require('fs');
const { loadSettings, defaultSites } = require('../src/main/settings');
const state = require('../src/main/state');

describe('loadSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should catch JSON parsing errors and use default settings', async () => {
    fs.promises.access.mockResolvedValue();
    fs.promises.readFile.mockResolvedValue('{ malformed json }');

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const loaded = await loadSettings();

    expect(fs.promises.access).toHaveBeenCalledWith(expect.stringContaining('settings.json'));
    expect(fs.promises.readFile).toHaveBeenCalledWith(expect.stringContaining('settings.json'), 'utf8');

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error loading settings',
      expect.any(SyntaxError)
    );

    expect(loaded).toEqual({
      extensions: [],
      sites: defaultSites,
      adBlockEnabled: true,
      pinnedExtensions: [],
      volume: 1.0,
    });

    expect(state.settings).toEqual(loaded);
    expect(state.appVolume).toBe(1.0);

    consoleErrorSpy.mockRestore();
  });
});
