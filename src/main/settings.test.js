const fs = require('fs');
const path = require('path');
const state = require('./state');
const { saveSettings } = require('./settings');

jest.mock('fs');
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn().mockReturnValue('/mock/user/data')
  }
}), { virtual: true });

describe('settings.js', () => {
  describe('saveSettings', () => {
    it('should save settings to state and file system', () => {
      jest.useFakeTimers();
      const mockSettings = { adBlockEnabled: false, volume: 0.5 };
      const expectedPath = path.join('/mock/user/data', 'settings.json');

      saveSettings(mockSettings);

      expect(state.settings).toEqual(mockSettings);

      jest.runAllTimers();

      expect(fs.writeFile).toHaveBeenCalledWith(
        expectedPath,
        JSON.stringify(mockSettings, null, 2),
        expect.any(Function)
      );

      jest.useRealTimers();
    });
  });
});
