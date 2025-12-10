import GLib from 'gi://GLib';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { setLogging, setLogFn, journal } from './utils.js';

const OverviewControls = Main.overview._overview._controls;
const thumbnailsBox = OverviewControls._thumbnailsBox;
const Dash = OverviewControls.dash;

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

    // OverviewControls.hide();

    // const ws = OverviewControls._workspacesDisplay;

    // ws.opacity = 0;         // invisible
    // ws.visible = false;     // GNOME ignores it in layout

    // // const search = Main.overview.searchEntry;
    // const search = OverviewControls._searchEntry;
    // search.hide();
    // search.opacity = 0;
    // search.visible = false;

    this._oldUpdateShouldShow = thumbnailsBox._updateShouldShow;
    thumbnailsBox._updateShouldShow = () => {
      const shouldShow = false;

      if (thumbnailsBox._shouldShow === shouldShow)
        return;

      thumbnailsBox._shouldShow = shouldShow;
      thumbnailsBox.notify('should-show');
    }
    thumbnailsBox._updateShouldShow();

    this._overviewSignalId = Main.overview.connect('showing', () => {
      journal('Overview showing - applying changes');

      this._setDashDimensions();
      this._setDashPosition();
      this._setIconSize();

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
  _setDashDimensions() {
    journal(`_setDashDimensions`);
    // Set dash container width
    Dash._dashContainer.width = -1;

    // Set dash and container heights
    Dash.height = 350;
    Dash._dashContainer.height = 150;

    // Set background height
    if (Dash._background) {
      Dash._background.set_height(150);
      Dash._background.min_height = 150;
    }
  }

  /**
   * Set dash position (vertical translation)
   */
  _setDashPosition() {
    journal(`_setDashPosition`);
    Dash.translation_y = -100;
  }

  /**
   * Force icon size to 112px
   */
  _setIconSize() {
    // Store original icon size
    this._originalIconSize = Dash.iconSize;

    // Connect to icon-size-changed to force our size
    this._iconSizeSignal = Dash.connect('icon-size-changed', () => {
      journal(`Icon size change`);
      if (Dash.iconSize !== 112) {
        journal(`Icon size not 112`);
        Dash.iconSize = 112;

        // // Manually update all icon sizes
        // const iconChildren = dash._box?.get_children().filter(actor => {
        //   return actor.child?._delegate?.icon;
        // }) || [];

        // iconChildren.forEach(actor => {
        //   const icon = actor.child?._delegate?.icon;
        //   if (icon) {
        //     icon.setIconSize(112);
        //   }
        // });

        // // Update show apps icon
        // if (dash._showAppsIcon?.icon) {
        //   dash._showAppsIcon.icon.setIconSize(112);
        // }
      }
    });

    // Set initial size
    Dash.iconSize = 112;
    // dash.emit('icon-size-changed');
  }

  disable() {
    // Cleanup startup signal if still connected
    if (this._overviewSignalId) {
      Main.overview.disconnect(this._overviewSignalId);
      this._overviewSignalId = null;
    }

    // Restore icon size
    if (this._iconSizeSignal) {
      Dash.disconnect(this._iconSizeSignal);
      this._iconSizeSignal = null;
    }

    if (this._originalIconSize !== null) {
      Dash.iconSize = this._originalIconSize;
      Dash.emit('icon-size-changed');
      this._originalIconSize = null;
    }

    // Reset dimensions
    Dash._dashContainer.width = -1;
    Dash.height = -1;
    Dash._dashContainer.height = -1;
    Dash.translation_y = 0;

    if (Dash._background) {
      Dash._background.set_height(-1);
      Dash._background.min_height = -1;
    }

    if (this._oldUpdateShouldShow) {
      thumbnailsBox._updateShouldShow = this._oldUpdateShouldShow;
    }
    thumbnailsBox._updateShouldShow();
  }
}
