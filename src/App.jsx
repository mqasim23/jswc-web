import { useEffect, useRef, useState } from 'react';
import { AppDataContext } from './context';
import { SelectComponent } from './components';
import {
  getObjectById,
  checkSupportedProperties,
  findFormParentID,
  deleteFormAndSiblings,
} from './utils';
import './App.css';
import * as _ from 'lodash';

function useForceRerender() {
  const [_state, setState] = useState(true);
  const reRender = () => {
    setState((prev) => !prev);
  };
  return { reRender };
}

const App = () => {
  const [socketData, setSocketData] = useState([]);
  const [socket, setSocket] = useState(null);
  const [layout, setLayout] = useState('Initialise');
  const webSocketRef = useRef(null);
  const [focusedElement, setFocusedElement] = useState(null);
  const [changeEvents, setChangeEvents] = useState([]);

  const { reRender } = useForceRerender();

  const dataRef = useRef({});
  const appRef = useRef(null);

  const handleData = (data, mode) => {
    const splitID = data.ID.split('.');

    let currentLevel = dataRef.current;

    for (let i = 0; i < splitID.length - 1; i++) {
      const key = splitID[i];

      if (!currentLevel[key]) {
        currentLevel[key] = {};
      }

      currentLevel = currentLevel[key];
    }

    // Check if the key already exists at the final level
    const finalKey = splitID[splitID.length - 1];
    if (currentLevel.hasOwnProperty(finalKey)) {
      if (mode === 'WC') {
        if (data.Properties && data.Properties.Type === 'Form') {
          localStorage.clear();
          console.log('current Level', currentLevel[finalKey]);
        }
        // Overwrite the existing object with new properties

        currentLevel[finalKey] = {
          ID: data.ID,
          ...data,
        };
      } else if (mode === 'WS') {
        // Merge the existing object with new properties
        currentLevel[finalKey] = {
          ID: data.ID,
          ...currentLevel[finalKey],
          Properties: {
            ...(currentLevel[finalKey].Properties || {}),
            ...(data.Properties || {}),
          },
        };
      }
    } else {
      // Create a new object at the final level
      currentLevel[finalKey] = {
        ID: data.ID,
        ...data,
      };
    }

    reRender();
  };

  const deleteObjectsById = (data, idsToDelete) => {
    function deleteById(obj, id) {
      for (const key in obj) {
        if (obj[key].ID === id) {
          delete obj[key];
          return true;
        }
        if (typeof obj[key] === 'object') {
          if (deleteById(obj[key], id)) {
            return true;
          }
        }
      }
      return false;
    }
    idsToDelete.forEach((id) => {
      deleteById(data, id);
    });

    dataRef.current = data;
    socketData.filter((item) => idsToDelete.some((id) => item.ID.startsWith(id)));
    reRender();
  };

  const fetchData = (port) => {
    const runningPort = port == '5173' ? '22322' : port;
    let zoom = Math.round(window.devicePixelRatio * 100);
    webSocketRef.current = new WebSocket(`ws://localhost:${runningPort}/`);

    const webSocket = webSocketRef.current;
    setSocket(webSocket);
    webSocket.onopen = () => {
      let event = JSON.stringify({
        DeviceCapabilities: {
          ViewPort: [window.innerHeight, window.innerWidth],
          ScreenSize: [window.screen.height, window.screen.width],
          DPR: zoom / 100,
          PPI: 200,
        },
      });

      webSocket.send(event);

      webSocket.send(layout);
      // webSocket.send('Initialise');4
    };
    webSocket.onmessage = (event) => {
      localStorage.setItem('PORT', runningPort);
      // Window Creation WC
      const keys = Object.keys(JSON.parse(event.data));
      if (keys[0] == 'WC') {
        let windowCreationEvent = JSON.parse(event.data).WC;
        if (windowCreationEvent?.Properties?.Type == 'Form') {
          localStorage.clear();
          const updatedData = deleteFormAndSiblings(dataRef.current);
          dataRef.current = {};
          dataRef.current = updatedData;
          handleData(JSON.parse(event.data).WC, 'WC');
          return;
        }

        // console.log('event from server WC', JSON.parse(event.data).WC);
        setSocketData((prevData) => [...prevData, JSON.parse(event.data).WC]);
        handleData(JSON.parse(event.data).WC, 'WC');
      } else if (keys[0] == 'WS') {
        const serverEvent = JSON.parse(event.data).WS;

        let value = null;
        // @Todo Check that the Edit is Already Present or not if it is Present just change the value we are getting from the server
        const data = JSON.parse(getObjectById(dataRef.current, serverEvent.ID));

        if (data?.Properties?.Type == 'Edit') {
          if (serverEvent?.Properties.hasOwnProperty('Text')) {
            value = serverEvent?.Properties.Text;
          } else if (serverEvent?.Properties.hasOwnProperty('Value')) {
            value = serverEvent?.Properties.Value;
          }
          // Check that the Already Present Data have Text Key or Value Key
          if (data?.Properties.hasOwnProperty('Text')) {
            setSocketData((prevData) => [...prevData, JSON.parse(event.data).WS]);
            return handleData(
              {
                ID: serverEvent.ID,
                Properties: {
                  Text: value,
                },
              },
              'WS'
            );
          } else if (data?.Properties.hasOwnProperty('Value')) {
            setSocketData((prevData) => [...prevData, JSON.parse(event.data).WS]);
            return handleData(
              {
                ID: serverEvent.ID,
                Properties: {
                  Value: value,
                },
              },
              'WS'
            );
          }
        }

        if (data?.Properties?.Type == 'Combo') {
          if (serverEvent?.Properties.hasOwnProperty('SelItems')) {
            setSocketData((prevData) => [...prevData, JSON.parse(event.data).WS]);
            value = serverEvent?.Properties.SelItems;
            const indextoFind = value.indexOf(1);
            let Text = data?.Properties?.Items[indextoFind];
            return handleData(
              {
                ID: serverEvent.ID,
                Properties: {
                  ...data?.Properties,
                  SelItems: value,
                  Text,
                },
              },
              'WS'
            );
          }
        }

        setSocketData((prevData) => [...prevData, JSON.parse(event.data).WS]);
        handleData(JSON.parse(event.data).WS, 'WS');
      } else if (keys[0] == 'WG') {
        const serverEvent = JSON.parse(event.data).WG;

        const refData = JSON.parse(getObjectById(dataRef.current, serverEvent?.ID));
        const Type = refData?.Properties?.Type;

        // Get Data from the Ref

        const { Properties } = refData;

        if (Type == 'Grid') {
          const { Values } = Properties;

          const supportedProperties = ['Values', 'CurCell'];

          const result = checkSupportedProperties(supportedProperties, serverEvent?.Properties);

          if (!localStorage.getItem(serverEvent.ID)) {
            const serverPropertiesObj = {};
            serverEvent.Properties.map((key) => {
              return (serverPropertiesObj[key] = Properties[key]);
            });

            const event = JSON.stringify({
              WG: {
                ID: serverEvent.ID,
                Properties: serverPropertiesObj,
                WGID: serverEvent.WGID,
                ...(result && result.NotSupported && result.NotSupported.length > 0
                  ? { NotSupported: result.NotSupported }
                  : null),
              },
            });

            console.log(event);
            return webSocket.send(event);
          }

          const { Event } = JSON.parse(localStorage.getItem(serverEvent.ID));
          const serverPropertiesObj = {};
          serverEvent.Properties.map((key) => {
            return (serverPropertiesObj[key] = Event[key]);
          });

          // Values[Row - 1][Col - 1] = Value;
          console.log(
            JSON.stringify({
              WG: {
                ID: serverEvent.ID,
                Properties: serverPropertiesObj,
                WGID: serverEvent.WGID,
                ...(result && result.NotSupported && result.NotSupported.length > 0
                  ? { NotSupported: result.NotSupported }
                  : null),
              },
            })
          );

          // Modify the data store in the ref to get the updated value

          setSocketData((prevData) => [
            ...prevData,
            {
              ID: serverEvent.ID,
              Properties: {
                ...Properties,
                Values,
              },
            },
          ]);

          handleData({
            ID: serverEvent.ID,
            Properties: {
              ...Properties,
              Values,
            },
          });

          webSocket.send(
            JSON.stringify({
              WG: {
                ID: serverEvent.ID,
                Properties: serverPropertiesObj,
                WGID: serverEvent.WGID,
                ...(result && result.NotSupported && result.NotSupported.length > 0
                  ? { NotSupported: result.NotSupported }
                  : null),
              },
            })
          );
        }
        if (Type == 'Form') {
          const supportedProperties = ['Posn', 'Size'];
          const result = checkSupportedProperties(supportedProperties, serverEvent?.Properties);
          const serverPropertiesObj = {};
          const Form = JSON.parse(localStorage.getItem(serverEvent.ID));

          if (!localStorage.getItem(serverEvent.ID)) {
            const serverPropertiesObj = {};

            serverEvent.Properties.map((key) => {
              return (serverPropertiesObj[key] = Properties[key]);
            });

            const event = JSON.stringify({
              WG: {
                ID: serverEvent.ID,
                Properties: serverPropertiesObj,
                WGID: serverEvent.WGID,
                ...(result && result.NotSupported && result.NotSupported.length > 0
                  ? { NotSupported: result.NotSupported }
                  : null),
              },
            });

            console.log(event);
            return webSocket.send(event);
          }

          serverEvent.Properties.map((key) => {
            return (serverPropertiesObj[key] = Form[key]);
          });

          const event = JSON.stringify({
            WG: {
              ID: serverEvent.ID,
              Properties: serverPropertiesObj,
              WGID: serverEvent.WGID,
              ...(result && result.NotSupported && result.NotSupported.length > 0
                ? { NotSupported: result.NotSupported }
                : null),
            },
          });

          console.log(event);
          webSocket.send(event);
          return;
        }

        if (Type == 'Edit') {
          const { Text, Value } = Properties;
          const supportedProperties = ['Text', 'Value'];

          const result = checkSupportedProperties(supportedProperties, serverEvent?.Properties);

          if (!localStorage.getItem(serverEvent.ID)) {
            const editValue = Text ? Text : Value;

            const isNumber = refData?.Properties?.hasOwnProperty('FieldType');

            const serverPropertiesObj = {};
            serverEvent.Properties.map((key) => {
              return (serverPropertiesObj[key] =
                key == 'Text'
                  ? !editValue
                    ? ''
                    : editValue?.toString()
                  : isNumber
                  ? parseInt(editValue)
                  : editValue);
            });

            console.log(
              JSON.stringify({
                WG: {
                  ID: serverEvent.ID,
                  Properties: serverPropertiesObj,
                  WGID: serverEvent.WGID,
                  ...(result && result.NotSupported && result.NotSupported.length > 0
                    ? { NotSupported: result.NotSupported }
                    : null),
                },
              })
            );
            return webSocket.send(
              JSON.stringify({
                WG: {
                  ID: serverEvent.ID,
                  Properties: serverPropertiesObj,
                  WGID: serverEvent.WGID,
                  ...(result && result.NotSupported && result.NotSupported.length > 0
                    ? { NotSupported: result.NotSupported }
                    : null),
                },
              })
            );
          }

          const { Event } = JSON.parse(localStorage.getItem(serverEvent?.ID));
          const { Info } = Event;
          const serverPropertiesObj = {};
          serverEvent.Properties.map((key) => {
            return (serverPropertiesObj[key] = key == 'Value' ? Info : Info.toString());
          });

          console.log(
            JSON.stringify({
              WG: {
                ID: serverEvent.ID,
                Properties: serverPropertiesObj,
                WGID: serverEvent.WGID,
                ...(result && result.NotSupported && result.NotSupported.length > 0
                  ? { NotSupported: result.NotSupported }
                  : null),
              },
            })
          );
          webSocket.send(
            JSON.stringify({
              WG: {
                ID: serverEvent.ID,
                Properties: serverPropertiesObj,
                WGID: serverEvent.WGID,
                ...(result && result.NotSupported && result.NotSupported.length > 0
                  ? { NotSupported: result.NotSupported }
                  : null),
              },
            })
          );
        }

        if (Type == 'Combo') {
          const { SelItems, Items } = Properties;
          const supportedProperties = ['Text', 'SelItems', 'Posn', 'Size'];

          const result = checkSupportedProperties(supportedProperties, serverEvent?.Properties);

          if (!localStorage.getItem(serverEvent.ID)) {
            const serverPropertiesObj = {};
            serverEvent.Properties.map((key) => {
              return (serverPropertiesObj[key] = Properties[key]);
            });
            console.log(
              JSON.stringify({
                WG: {
                  ID: serverEvent.ID,
                  Properties: serverPropertiesObj,
                  WGID: serverEvent.WGID,
                  ...(result && result.NotSupported && result.NotSupported.length > 0
                    ? { NotSupported: result.NotSupported }
                    : null),
                },
              })
            );
            return webSocket.send(
              JSON.stringify({
                WG: {
                  ID: serverEvent.ID,
                  Properties: serverPropertiesObj,
                  WGID: serverEvent.WGID,
                  ...(result && result.NotSupported && result.NotSupported.length > 0
                    ? { NotSupported: result.NotSupported }
                    : null),
                },
              })
            );
          }
          const { Event } = JSON.parse(localStorage.getItem(serverEvent?.ID));
          const { Info, Size, Posn } = Event;

          if (SelItems) {
            SelItems?.fill(0);
            let indexToChange = Info - 1;
            SelItems[indexToChange] = 1;
          }

          const serverPropertiesObj = {};

          serverEvent.Properties.map((key) => {
            return (serverPropertiesObj[key] =
              key == 'SelItems' ? SelItems : key == 'Items' ? Items[indexToChange] : Event[key]);
          });

          console.log(
            JSON.stringify({
              WG: {
                ID: serverEvent.ID,
                Properties: serverPropertiesObj,
                WGID: serverEvent.WGID,
                ...(result && result.NotSupported && result.NotSupported.length > 0
                  ? { NotSupported: result.NotSupported }
                  : null),
              },
            })
          );
          return webSocket.send(
            JSON.stringify({
              WG: {
                ID: serverEvent.ID,
                Properties: serverPropertiesObj,
                WGID: serverEvent.WGID,
                ...(result && result.NotSupported && result.NotSupported.length > 0
                  ? { NotSupported: result.NotSupported }
                  : null),
              },
            })
          );
        }

        if (Type == 'List') {
          const { SelItems } = Properties;

          const supportedProperties = ['SelItems'];

          const result = checkSupportedProperties(supportedProperties, serverEvent?.Properties);

          if (!localStorage.getItem(serverEvent.ID)) {
            console.log(
              JSON.stringify({
                WG: {
                  ID: serverEvent.ID,
                  Properties: {
                    SelItems,
                  },
                  ...(result && result.NotSupported && result.NotSupported.length > 0
                    ? { NotSupported: result.NotSupported }
                    : null),

                  WGID: serverEvent.WGID,
                },
              })
            );
            return webSocket.send(
              JSON.stringify({
                WG: {
                  ID: serverEvent.ID,
                  Properties: {
                    SelItems,
                  },
                  ...(result && result.NotSupported && result.NotSupported.length > 0
                    ? { NotSupported: result.NotSupported }
                    : null),

                  WGID: serverEvent.WGID,
                },
              })
            );
          }

          const { Event } = JSON.parse(localStorage.getItem(serverEvent?.ID));
          console.log(
            JSON.stringify({
              WG: {
                ID: serverEvent.ID,
                Properties: {
                  SelItems: Event['SelItems'],
                },
                ...(result && result.NotSupported && result.NotSupported.length > 0
                  ? { NotSupported: result.NotSupported }
                  : null),

                WGID: serverEvent.WGID,
              },
            })
          );
          return webSocket.send(
            JSON.stringify({
              WG: {
                ID: serverEvent.ID,
                Properties: {
                  SelItems: Event['SelItems'],
                },
                ...(result && result.NotSupported && result.NotSupported.length > 0
                  ? { NotSupported: result.NotSupported }
                  : null),

                WGID: serverEvent.WGID,
              },
            })
          );
        }

        if (Type == 'Scroll') {
          const { Thumb } = Properties;
          const supportedProperties = ['Thumb'];

          const result = checkSupportedProperties(supportedProperties, serverEvent?.Properties);

          if (!localStorage.getItem(serverEvent.ID)) {
            console.log(
              JSON.stringify({
                WG: {
                  ID: serverEvent.ID,
                  Properties: {
                    Thumb,
                  },
                  WGID: serverEvent.WGID,
                  ...(result && result.NotSupported && result.NotSupported.length > 0
                    ? { NotSupported: result.NotSupported }
                    : null),
                },
              })
            );
            return webSocket.send(
              JSON.stringify({
                WG: {
                  ID: serverEvent.ID,
                  Properties: {
                    Thumb,
                  },
                  WGID: serverEvent.WGID,
                  ...(result && result.NotSupported && result.NotSupported.length > 0
                    ? { NotSupported: result.NotSupported }
                    : null),
                },
              })
            );
          }

          const { Event } = JSON.parse(localStorage.getItem(serverEvent?.ID));
          const { Info } = Event;

          console.log(
            JSON.stringify({
              WG: {
                ID: serverEvent.ID,
                Properties: {
                  Thumb: Info[1],
                },
                WGID: serverEvent.WGID,
                ...(result && result.NotSupported && result.NotSupported.length > 0
                  ? { NotSupported: result.NotSupported }
                  : null),
              },
            })
          );
          return webSocket.send(
            JSON.stringify({
              WG: {
                ID: serverEvent.ID,
                Properties: {
                  Thumb: Info[1],
                },
                WGID: serverEvent.WGID,
                ...(result && result.NotSupported && result.NotSupported.length > 0
                  ? { NotSupported: result.NotSupported }
                  : null),
              },
            })
          );
        }

        if (Type == 'Splitter') {
          const { Posn } = Properties;
          const supportedProperties = ['Posn', 'Size'];

          const result = checkSupportedProperties(supportedProperties, serverEvent?.Properties);

          if (!localStorage.getItem(serverEvent.ID)) {
            const serverPropertiesObj = {};
            serverEvent.Properties.map((key) => {
              return (serverPropertiesObj[key] = Properties[key]);
            });

            console.log(
              JSON.stringify({
                WG: {
                  ID: serverEvent.ID,
                  Properties: serverPropertiesObj,
                  WGID: serverEvent.WGID,
                  ...(result && result.NotSupported && result.NotSupported.length > 0
                    ? { NotSupported: result.NotSupported }
                    : null),
                },
              })
            );
            return webSocket.send(
              JSON.stringify({
                WG: {
                  ID: serverEvent.ID,
                  Properties: serverPropertiesObj,
                  WGID: serverEvent.WGID,
                  ...(result && result.NotSupported && result.NotSupported.length > 0
                    ? { NotSupported: result.NotSupported }
                    : null),
                },
              })
            );
          }

          const { Event } = JSON.parse(localStorage.getItem(serverEvent.ID));
          const { Info, Size } = Event;

          const serverPropertiesObj = {};
          serverEvent.Properties.map((key) => {
            return (serverPropertiesObj[key] = key == 'Posn' ? Info : Size);
          });

          console.log(
            JSON.stringify({
              WG: {
                ID: serverEvent.ID,
                Properties: serverPropertiesObj,
                WGID: serverEvent.WGID,
                ...(result && result.NotSupported && result.NotSupported.length > 0
                  ? { NotSupported: result.NotSupported }
                  : null),
              },
            })
          );
          return webSocket.send(
            JSON.stringify({
              WG: {
                ID: serverEvent.ID,
                Properties: serverPropertiesObj,
                WGID: serverEvent.WGID,
                ...(result && result.NotSupported && result.NotSupported.length > 0
                  ? { NotSupported: result.NotSupported }
                  : null),
              },
            })
          );
        }

        if (Type == 'SubForm') {
          const supportedProperties = ['Posn', 'Size'];

          const result = checkSupportedProperties(supportedProperties, serverEvent?.Properties);

          console.log('server', serverEvent);

          if (!localStorage.getItem(serverEvent.ID)) {
            const serverPropertiesObj = {};

            serverEvent.Properties.map((key) => {
              return (serverPropertiesObj[key] = Properties[key]);
            });

            console.log(
              JSON.stringify({
                WG: {
                  ID: serverEvent.ID,
                  Properties: serverPropertiesObj,
                  WGID: serverEvent.WGID,
                  ...(result && result.NotSupported && result.NotSupported.length > 0
                    ? { NotSupported: result.NotSupported }
                    : null),
                },
              })
            );
            return webSocket.send(
              JSON.stringify({
                WG: {
                  ID: serverEvent.ID,
                  Properties: serverPropertiesObj,
                  WGID: serverEvent.WGID,
                  ...(result && result.NotSupported && result.NotSupported.length > 0
                    ? { NotSupported: result.NotSupported }
                    : null),
                },
              })
            );
          }
          const serverPropertiesObj = {};
          const SubForm = JSON.parse(localStorage.getItem(serverEvent.ID));
          serverEvent.Properties.map((key) => {
            return (serverPropertiesObj[key] = SubForm[key]);
          });

          console.log(
            JSON.stringify({
              WG: {
                ID: serverEvent.ID,
                Properties: serverPropertiesObj,
                WGID: serverEvent.WGID,
                ...(result && result.NotSupported && result.NotSupported.length > 0
                  ? { NotSupported: result.NotSupported }
                  : null),
              },
            })
          );
          return webSocket.send(
            JSON.stringify({
              WG: {
                ID: serverEvent.ID,
                Properties: serverPropertiesObj,
                WGID: serverEvent.WGID,
                ...(result && result.NotSupported && result.NotSupported.length > 0
                  ? { NotSupported: result.NotSupported }
                  : null),
              },
            })
          );
        }

        if (Type == 'Button') {
          const { State } = Properties;
          const supportedProperties = ['State', 'Posn', 'Size'];

          const result = checkSupportedProperties(supportedProperties, serverEvent?.Properties);

          if (!localStorage.getItem(serverEvent.ID)) {
            const serverPropertiesObj = {};
            serverEvent.Properties.map((key) => {
              return (serverPropertiesObj[key] =
                key == 'State' ? (State ? State : 0) : Properties[key]);
            });

            const event = JSON.stringify({
              WG: {
                ID: serverEvent.ID,
                Properties: serverPropertiesObj,
                WGID: serverEvent.WGID,
                ...(result && result.NotSupported && result.NotSupported.length > 0
                  ? { NotSupported: result.NotSupported }
                  : null),
              },
            });

            console.log(event);
            return webSocket.send(event);
          }

          const { Event } = JSON.parse(localStorage.getItem(serverEvent.ID));
          const { Value } = Event;

          const serverPropertiesObj = {};

          serverEvent.Properties.map((key) => {
            return (serverPropertiesObj[key] = key == 'State' ? Value : Event[key]);
          });

          const event = JSON.stringify({
            WG: {
              ID: serverEvent.ID,
              Properties: serverPropertiesObj,
              WGID: serverEvent.WGID,
              ...(result && result.NotSupported && result.NotSupported.length > 0
                ? { NotSupported: result.NotSupported }
                : null),
            },
          });

          console.log(event);

          return webSocket.send(event);
        }

        if (Type == 'TreeView') {
          const supportedProperties = ['SelItems'];
          const result = checkSupportedProperties(supportedProperties, serverEvent?.Properties);
          const { Event } = JSON.parse(localStorage.getItem(serverEvent.ID));
          const { SelItems } = Event;

          const event = JSON.stringify({
            WG: {
              ID: serverEvent.ID,
              Properties: {
                SelItems,
              },
              WGID: serverEvent.WGID,
              ...(result && result.NotSupported && result.NotSupported.length > 0
                ? { NotSupported: result.NotSupported }
                : null),
            },
          });

          console.log(event);
          return webSocket.send(event);
        }

        if (Type == 'Timer') {
          const supportedProperties = ['FireOnce'];
          const result = checkSupportedProperties(supportedProperties, serverEvent?.Properties);
          const { Event } = JSON.parse(localStorage.getItem(serverEvent.ID));
          const { FireOnce } = Event;

          const event = JSON.stringify({
            WG: {
              ID: serverEvent.ID,
              Properties: {
                FireOnce,
              },
              WGID: serverEvent.WGID,
              ...(result && result.NotSupported && result.NotSupported.length > 0
                ? { NotSupported: result.NotSupported }
                : null),
            },
          });
          console.log(event);
          return webSocket.send(event);
        }

        if (Type == 'ListView') {
          const supportedProperties = ['SelItems'];
          const result = checkSupportedProperties(supportedProperties, serverEvent?.Properties);
          const { Event } = JSON.parse(localStorage.getItem(serverEvent.ID));

          const { SelItems } = Event;
          const event = JSON.stringify({
            WG: {
              ID: serverEvent.ID,
              Properties: {
                SelItems,
              },
              WGID: serverEvent.WGID,
              ...(result && result.NotSupported && result.NotSupported.length > 0
                ? { NotSupported: result.NotSupported }
                : null),
            },
          });

          console.log(event);
          return webSocket.send(event);
        }
      } else if (keys[0] == 'NQ') {
        const nqEvent = JSON.parse(event.data).NQ;

        const { Event, ID, Info } = nqEvent;

        const appElement = getObjectById(dataRef.current, ID);

        if (Event && Event == 'Configure') {
          handleData(
            {
              ID: ID,
              Properties: {
                ...appElement.Properties,
                Posn: [Info[0], Info[1]],
                Size: [Info[2], Info[3]],
              },
            },
            'WS'
          );

          return;
        } else if ((Event && Event == 'ItemDown') || (Event && Event == 'GotFocus')) {
          const refData = JSON.parse(getObjectById(dataRef.current, ID));

          const exists =
            refData?.Properties?.Event &&
            refData?.Properties?.Event.some((item) => item[0] === Event);

          const event = JSON.stringify({
            Event: {
              EventName: Event,
              ID,
              Info,
            },
          });
          console.log(event);
          if (!exists) return;
          webSocket.send(event);
          return;
        }

        const element = document.getElementById(nqEvent.ID);
        element && element.focus();
      } else if (keys[0] == 'EX') {
        const serverEvent = JSON.parse(event.data).EX;

        deleteObjectsById(dataRef.current, serverEvent?.ID);
      } else if (keys[0] == 'Options') {
        handleData(JSON.parse(event.data).Options, 'WC');
      } else if (keys[0] == 'FormatCell') {
        const formatCellEvent = JSON.parse(event.data);
        const { FormatCell } = formatCellEvent;
        const refData = JSON.parse(getObjectById(dataRef.current, FormatCell?.ID));
        const { Properties } = refData;
        const updatedFormattedValues = Properties?.FormattedValues;
        updatedFormattedValues[FormatCell.Cell[0] - 1][FormatCell.Cell[1] - 1] =
          FormatCell?.FormattedValue;
        handleData(
          {
            ID: FormatCell?.ID,
            Properties: {
              ...refData?.Properties,
              FormattedValues: updatedFormattedValues,
            },
          },
          'WS'
        );
      }
    };
  };

  useEffect(() => {
    dataRef.current = {};
    setSocketData([]);
    localStorage.clear();
    const currentPort = window.location.port;
    fetchData(currentPort);

    const handleBeforeUnload = () => {
      // Attempt to send a closing message before the tab is closed
      if (webSocketRef.current) {
        webSocketRef.current.send(JSON.stringify({ Signal: { Name: 'Close' } }));
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      // Remove the event listener when the component is unmounted
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Close the WebSocket if it's still open
      if (webSocketRef.current && webSocketRef.current.readyState === WebSocket.OPEN) {
        webSocketRef.current.close();
      }
    };
  }, [layout]);

  const handleFocus = (element) => {
    const formParentID = findFormParentID(dataRef.current);
    if (localStorage.getItem('change-event')) {
      const { Event } = JSON.parse(localStorage.getItem('change-event'));
      const updatedEvent = {
        ...Event,
        Info: [!element.target.id ? formParentID : element.target.id],
      };

      let webSocket = webSocketRef.current;

      webSocket.send(JSON.stringify({ Event: { ...updatedEvent } }));
      localStorage.removeItem('change-event');
    }
  };

  useEffect(() => {
    const container = appRef.current;

    if (container) {
      // container.addEventListener('focusin', handleFocus);
      container.addEventListener('click', handleFocus);
    }
    return () => {
      if (container) {
        // container.removeEventListener('focusin', handleFocus);
        container.removeEventListener('click', handleFocus);
      }
    };
  }, []);

  // const updatedData = _.cloneDeep(dataRef.current);
  console.log('App', dataRef.current);

  const formParentID = findFormParentID(dataRef.current);

  return (
    <div ref={appRef}>
      <AppDataContext.Provider
        value={{
          socketData,
          dataRef,
          socket,
          handleData,
          focusedElement,
          reRender,
          setChangeEvents,
        }}
      >
        {dataRef && formParentID && <SelectComponent data={dataRef.current[formParentID]} />}
      </AppDataContext.Provider>
    </div>
  );
};

export default App;

// {
//   JSON.stringify(updatedData[formParentID]?.['LEFT']?.Properties);
// }
