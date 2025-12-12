import GLib from 'gi://GLib';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { setLogging, setLogFn, journal } from './utils.js';

const OverviewControls = Main.overview._overview._controls;

const Dash = OverviewControls.dash;

export default class NotificationThemeExtension extends Extension {
  constructor(metadata) {
    super(metadata);
    this._startupCompleteId = null;
    this._iconSizeSignal = null;
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

    // Dash.iconSize = 112;
    // Dash._maxIconSize = 112;
    // Dash._redisplay();

    // Dash.hide();

    // OverviewControls.hide();

    // const ws = OverviewControls._workspacesDisplay;

    // ws.opacity = 0;         // invisible
    // ws.visible = false;     // GNOME ignores it in layout

    // // const search = Main.overview.searchEntry;
    // const search = OverviewControls._searchEntry;
    // search.hide();
    // search.opacity = 0;
    // search.visible = false;

    // this._overviewSignalId = Main.overview.connect('showing', () => {
    //   journal('Overview showing - applying changes');

    //   this._setDashDimensions();
    //   this._setDashPosition();
    //   this._setIconSize();

    //   // Disconnect after first use
    //   if (this._overviewSignalId) {
    //     Main.overview.disconnect(this._overviewSignalId);
    //     this._overviewSignalId = null;
    //   }
    // });

    this._setDashDimensions();
    this._setDashPosition();
    this._setIconSize();
  }

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

  // in dash-by-blueray453 new Dash() creates a fresh dash object that YOU control.
  // It doesn't have any automatic resizing behavior set up yet
  // GNOME Shell's overview manager isn't controlling it
  // So setting iconSize directly works and sticks
  // When modifying the EXISTING overview dash:
  // Main.overview.dash is already managed by GNOME Shell's overview system
  // The overview has already connected signals and logic that
  // automatically resize the dash
  // The overview's _updateWorkspacesDisplay(), _relayout(), and other methods
  // continuously recalculate and update the dash icon size based on screen geometry
  // So your manual size change gets immediately overridden
  // Think of it like:
  // New Dash: A blank canvas you control completely
  // Overview Dash: A dash with a "manager" constantly adjusting it
  // That's why for the overview dash, you need to:
  // Listen to icon-size-changed and force it back(your working solution)
  _setIconSize() {
    // Connect to icon-size-changed to force our size
    this._iconSizeSignal = Dash.connect('icon-size-changed', () => {
      journal(`Icon size change`);
      if (Dash.iconSize !== 112) {
        journal(`Icon size not 112`);
        Dash.iconSize = 112;
      }
    });

    // Set initial size
    Dash.iconSize = 112;
    // Dash._maxIconSize = 112;
    Dash._redisplay();
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

    // Reset dimensions
    Dash._dashContainer.width = -1;
    Dash.height = -1;
    Dash._dashContainer.height = -1;
    Dash.translation_y = 0;

    if (Dash._background) {
      Dash._background.set_height(-1);
      Dash._background.min_height = -1;
    }
  }
}
