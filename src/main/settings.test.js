jest.mock('electron', () => ({
  app: {
    getPath: jest.fn().mockReturnValue('/mock/user/data')
  }
}), { virtual: true });
jest.mock('fs');

const fs = require('fs');
const path = require('path');
const state = require('./state');
const { saveSettings } = require('./settings');

describe('settings.js', () => {
  describe('saveSettings', () => {
    it('should save settings to state and file system', async () => {
      const mockSettings = { adBlockEnabled: false, volume: 0.5 };
      const expectedPath = path.join('/mock/user/data', 'settings.json');

      fs.promises = {
        writeFile: jest.fn().mockResolvedValue(undefined)
      };

      await saveSettings(mockSettings);

      expect(state.settings).toEqual(mockSettings);
      expect(fs.promises.writeFile).toHaveBeenCalledWith(
        expectedPath,
        JSON.stringify(mockSettings, null, 2)
      );

      jest.useRealTimers();
    });
  });
});
