const fs = require('fs');
const path = require('path');
const state = require('./state');
const { saveSettings, loadSettings } = require('./settings');

jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn()
  }
}));

jest.mock('electron', () => ({
  app: {
    getPath: jest.fn().mockReturnValue('/mock/user/data')
  }
}), { virtual: true });

describe('settings.js', () => {
  describe('saveSettings', () => {
    it('should save settings to state and file system asynchronously', async () => {
      jest.useFakeTimers();
      const mockSettings = { adBlockEnabled: false, volume: 0.5 };
      const expectedPath = path.join('/mock/user/data', 'settings.json');

      const promise = saveSettings(mockSettings);

      expect(state.settings).toEqual(mockSettings);

      jest.runAllTimers();
      await promise;

      expect(fs.promises.writeFile).toHaveBeenCalledWith(
        expectedPath,
        JSON.stringify(mockSettings, null, 2)
      );

      jest.useRealTimers();
    });
  });
});
