import GLib from 'gi://GLib';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { setLogging, setLogFn, journal } from './utils.js'

export default class NotificationThemeExtension extends Extension {
  constructor(metadata) {
    super(metadata);
    this._startupCompleteId = null;
    this._iconSizeSignal = null;
    this._originalIconSize = null;
  }

  enable() {
    setLogFn((msg, error = false) => {
      let level;
      if (error) {
        level = GLib.LogLevelFlags.LEVEL_CRITICAL;
      } else {
        level = GLib.LogLevelFlags.LEVEL_MESSAGE;
      }

      GLib.log_structured(
        'fix-dash-by-blueray453',
        level,
        {
          MESSAGE: `${msg}`,
          SYSLOG_IDENTIFIER: 'fix-dash-by-blueray453',
          CODE_FILE: GLib.filename_from_uri(import.meta.url)[0]
        }
      );
    });

    setLogging(true);

    // journalctl -f -o cat SYSLOG_IDENTIFIER=fix-dash-by-blueray453
    journal(`Enabled`);

    this._overviewSignalId = Main.overview.connect('showing', () => {
      journal('Overview showing - applying changes');
      const dash = Main.overview._overview._controls?.dash;
      if (!dash) {
        journal('Dash not found');
        return;
      }

      this._setDashDimensions(dash);
      this._setDashPosition(dash);
      this._setIconSize(dash);

      // Disconnect after first use
      if (this._overviewSignalId) {
        Main.overview.disconnect(this._overviewSignalId);
        this._overviewSignalId = null;
      }
    });
  }


  /**
     * Set dash container and background dimensions
     */
  _setDashDimensions(dash) {
    journal(`_setDashDimensions`);
    // Set dash container width
    dash._dashContainer.width = 1100;

    // Set dash and container heights
    dash.height = 350;
    dash._dashContainer.height = 150;

    // Set background height
    if (dash._background) {
      dash._background.set_height(150);
      dash._background.min_height = 150;
    }
  }

  /**
   * Set dash position (vertical translation)
   */
  _setDashPosition(dash) {
    journal(`_setDashPosition`);
    dash.translation_y = -100;
  }

  /**
   * Force icon size to 112px
   */
  _setIconSize(dash) {
    // Store original icon size
    this._originalIconSize = dash.iconSize;

    // Connect to icon-size-changed to force our size
    this._iconSizeSignal = dash.connect('icon-size-changed', () => {
      if (dash.iconSize !== 112) {
        dash.iconSize = 112;

        // Manually update all icon sizes
        const iconChildren = dash._box?.get_children().filter(actor => {
          return actor.child?._delegate?.icon;
        }) || [];

        iconChildren.forEach(actor => {
          const icon = actor.child?._delegate?.icon;
          if (icon) {
            icon.setIconSize(112);
          }
        });

        // Update show apps icon
        if (dash._showAppsIcon?.icon) {
          dash._showAppsIcon.icon.setIconSize(112);
        }
      }
    });

    // Set initial size
    dash.iconSize = 112;
    dash.emit('icon-size-changed');
  }

  disable() {
    // Cleanup startup signal if still connected
    if (this._overviewSignalId) {
      Main.overview.disconnect(this._overviewSignalId);
      this._overviewSignalId = null;
    }

    const dash = Main.overview._overview._controls?.dash;
    if (!dash) return;

    // Restore icon size
    if (this._iconSizeSignal) {
      dash.disconnect(this._iconSizeSignal);
      this._iconSizeSignal = null;
    }

    if (this._originalIconSize !== null) {
      dash.iconSize = this._originalIconSize;
      dash.emit('icon-size-changed');
      this._originalIconSize = null;
    }

    // Reset dimensions
    dash._dashContainer.width = -1;
    dash.height = -1;
    dash._dashContainer.height = -1;
    dash.translation_y = 0;

    if (dash._background) {
      dash._background.set_height(-1);
      dash._background.min_height = -1;
    }
  }
}
