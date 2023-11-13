import { useEffect, useRef, useState } from 'react';
import { AppDataContext } from './context';
import { SelectComponent } from './components';
import { checkPeriod, getObjectById } from './utils';
import { Edit } from './objects';
import './App.css';

const App = () => {
  const [socketData, setSocketData] = useState([]);
  const [socket, setSocket] = useState(null);
  const [layout, setLayout] = useState('Initialise');

  const dataRef = useRef({});

  const handleData = (data) => {
    const periodCount = checkPeriod(data.ID);

    const splitID = data.ID.split('.');

    if (periodCount == 0) {
      if (!dataRef.current[splitID[0]]) {
        dataRef.current[splitID[0]] = { ...data };
      }
    } else if (periodCount == 1) {
      // If we found same Id key so we came in this check
      if (dataRef.current[splitID[0]].hasOwnProperty(splitID[1])) {
        return (dataRef.current[splitID[0]][splitID[1]] = {
          ...dataRef.current[splitID[0]][splitID[1]],
          Properties: { ...dataRef.current[splitID[0]][splitID[1]].Properties, ...data.Properties },
        });
      }
      dataRef.current[splitID[0]][splitID[1]] = data;
    } else if (periodCount == 2) {
      dataRef.current[splitID[0]][splitID[1]][splitID[2]] = data;
    } else if (periodCount == 3) {
      // adding a check if the key already exists or not
      if (dataRef.current[splitID[0]][splitID[1]][splitID[2]].hasOwnProperty(splitID[3])) {
        return (dataRef.current[splitID[0]][splitID[1]][splitID[2]][splitID[3]] = {
          ...dataRef.current[splitID[0]][splitID[1]][splitID[2]][splitID[3]],
          Properties: {
            ...dataRef.current[splitID[0]][splitID[1]][splitID[2]][splitID[3]].Properties,
            ...data.Properties,
          },
        });
      }
      dataRef.current[splitID[0]][splitID[1]][splitID[2]][splitID[3]] = data;
    } else if (periodCount == 4) {
      if (
        dataRef.current[splitID[0]][splitID[1]][splitID[2]][splitID[3]].hasOwnProperty(splitID[4])
      ) {
        return (dataRef.current[splitID[0]][splitID[1]][splitID[2]][splitID[3]][splitID[4]] = {
          ...dataRef.current[splitID[0]][splitID[1]][splitID[2]][splitID[3]][splitID[4]],
          Properties: {
            ...dataRef.current[splitID[0]][splitID[1]][splitID[2]][splitID[3]][splitID[4]]
              .Properties,
            ...data.Properties,
          },
        });
      }

      dataRef.current[splitID[0]][splitID[1]][splitID[2]][splitID[3]][splitID[4]] = data;
    } else if (periodCount == 5) {
      dataRef.current[splitID[0]][splitID[1]][splitID[2]][splitID[3]][splitID[4]][splitID[5]] =
        data;
    }
  };

  const fetchData = () => {
    const webSocket = new WebSocket('ws://localhost:22322/');
    setSocket(webSocket);
    webSocket.onopen = () => {
      webSocket.send(layout);
      // webSocket.send('Initialise');
    };
    webSocket.onmessage = (event) => {
      // Window Creation WC

      if (event.data.includes('WC')) {
        // console.log('event from server WC', JSON.parse(event.data).WC);

        setSocketData((prevData) => [...prevData, JSON.parse(event.data).WC]);
        handleData(JSON.parse(event.data).WC);
      } else if (event.data.includes('WS')) {
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
            return handleData({
              ID: serverEvent.ID,
              Properties: {
                Text: value,
              },
            });
          } else if (data?.Properties.hasOwnProperty('Value')) {
            setSocketData((prevData) => [...prevData, JSON.parse(event.data).WS]);
            return handleData({
              ID: serverEvent.ID,
              Properties: {
                Value: value,
              },
            });
          }
        }

        setSocketData((prevData) => [...prevData, JSON.parse(event.data).WS]);
        handleData(JSON.parse(event.data).WS);
      } else if (event.data.includes('WG')) {
        // console.log('event from server WG', JSON.parse(event.data).WG);

        const serverEvent = JSON.parse(event.data).WG;

        // check if the event Emit from the client side
        if (
          localStorage.getItem('lastEvent') ||
          localStorage.getItem('lastGrid') ||
          localStorage.getItem('lastEdit') ||
          localStorage.getItem('verticalSplitter') ||
          localStorage.getItem('horizontalSplitter') ||
          localStorage.getItem('comboEvent')
        ) {
          const data = JSON.parse(getObjectById(dataRef.current, serverEvent.ID));

          // Handle the Grid Event
          if (data?.Properties?.Type == 'Grid') {
            const { Event } = JSON.parse(localStorage.getItem('lastGrid'));
            const { Row, Col, Value } = Event;

            const {
              Properties: { Values },
            } = data;
            Values[Row - 1][Col - 1] = Value;

            console.log(
              JSON.stringify({
                WG: { ID: serverEvent.ID, Properties: { Values: Values }, WGID: serverEvent.WGID },
              })
            );
            webSocket.send(
              JSON.stringify({
                WG: { ID: serverEvent.ID, Properties: { Values: Values }, WGID: serverEvent.WGID },
              })
            );
          }

          // handle the Edit Event
          if (data?.Properties?.Type == 'Edit') {
            const { Event } = JSON.parse(localStorage.getItem('lastEdit'));
            const { Info } = Event;

            const serverPropertiesObj = {};

            serverEvent.Properties.map((key) => {
              return (serverPropertiesObj[key] =
                key == 'Value'
                  ? Info
                  : data.Properties.FieldType == 'Numeric'
                  ? parseInt(Info, 10)
                  : Info.toString());
            });

            console.log(
              JSON.stringify({
                WG: { ID: serverEvent.ID, Properties: serverPropertiesObj, WGID: serverEvent.WGID },
              })
            );
            webSocket.send(
              JSON.stringify({
                WG: { ID: serverEvent.ID, Properties: serverPropertiesObj, WGID: serverEvent.WGID },
              })
            );
          }

          //Handle the Combo Event

          if (data?.Properties?.Type == 'Combo') {
            const { Event } = JSON.parse(localStorage.getItem('comboEvent'));
            const { Info } = Event;
            const {
              Properties: { SelItems },
            } = data;

            SelItems.fill(0);
            let indexToChange = Info - 1;
            SelItems[indexToChange] = 1;

            const serverPropertiesObj = {};

            serverEvent.Properties.map((key) => {
              return (serverPropertiesObj[key] =
                key == 'SelItems' ? SelItems : data?.Properties?.Text);
            });

            console.log(
              JSON.stringify({
                WG: {
                  ID: serverEvent.ID,
                  Properties: serverPropertiesObj,
                  WGID: serverEvent.WGID,
                },
              })
            );
            webSocket.send(
              JSON.stringify({
                WG: {
                  ID: serverEvent.ID,
                  Properties: serverPropertiesObj,
                  WGID: serverEvent.WGID,
                },
              })
            );
          }

          // Handle the SubForm
          if (data?.Properties?.Type == 'SubForm') {
            const ID = data?.ID;
            let Splitter = null;

            // Check that this ID belongs to the vertical scroll or horizontal Scroll

            // Vertical and Left
            if (ID.includes('LEFT') && !ID.includes('TOP') && !ID.includes('BOT')) {
              Splitter = localStorage.getItem('verticalSplitter');
              const { Event } = JSON.parse(Splitter);
              const { Info } = Event;
              const serverObj = {};
              serverEvent.Properties.map((key) => {
                serverObj[key] = key == 'Size' ? [Info[2], Info[1]] : [Info[0], Info[1]];
              });

              console.log(
                JSON.stringify({
                  WG: {
                    ID: serverEvent.ID,
                    Properties: serverObj,
                    WGID: serverEvent.WGID,
                  },
                })
              );
              webSocket.send(
                JSON.stringify({
                  WG: {
                    ID: serverEvent.ID,
                    Properties: serverObj,
                    WGID: serverEvent.WGID,
                  },
                })
              );
            }

            // Vertical and Right
            if (ID.includes('RIGHT') && !ID.includes('TOP') && !ID.includes('BOT')) {
              const rightPane = JSON.parse(localStorage.getItem('verticalSplitter'));

              // check that it is requesting the position of the RightSubForm without moving the Vertical Splitter
              if (!rightPane) {
                const serverObj = {};
                serverEvent.Properties.map((key) => {
                  serverObj[key] = key == 'Size' ? [800, 800 - 203] : [0, 200];
                });
                console.log(
                  JSON.stringify({
                    WG: {
                      ID: serverEvent.ID,
                      Properties: serverObj,
                      WGID: serverEvent.WGID,
                    },
                  })
                );

                webSocket.send(
                  JSON.stringify({
                    WG: {
                      ID: serverEvent.ID,
                      Properties: serverObj,
                      WGID: serverEvent.WGID,
                    },
                  })
                );
              }

              const { Event } = rightPane;
              const { Info, EventName, ID } = Event;

              const newValue = 800 - (Info[1] + Info[3]);

              const serverObj = {};
              serverEvent.Properties.map((key) => {
                serverObj[key] = key == 'Size' ? [Info[2], newValue] : [0, Info[1] + 3];
              });

              console.log(
                JSON.stringify({
                  WG: {
                    ID: serverEvent.ID,
                    Properties: serverObj,
                    WGID: serverEvent.WGID,
                  },
                })
              );

              webSocket.send(
                JSON.stringify({
                  WG: {
                    ID: serverEvent.ID,
                    Properties: serverObj,
                    WGID: serverEvent.WGID,
                  },
                })
              );
            }

            //Horizontal and Top

            if (ID.includes('TOP')) {
              const topSubForm = JSON.parse(localStorage.getItem('horizontalSplitter'));
              const rigthSubForm = JSON.parse(localStorage.getItem('verticalSplitter'));
              const { Event } = topSubForm;
              const { Info } = Event;

              let rightWidth = null;

              const serverObj = {};

              //Size [height,width]  POSN [top,left]

              if (rigthSubForm)
                rightWidth = 800 - (rigthSubForm.Event.Info[1] + rigthSubForm.Event.Info[3]);
              else rightWidth = 800 - 203;

              serverEvent.Properties.map((key) => {
                serverObj[key] = key == 'Size' ? [Info[0], rightWidth] : [Info[0], 0];
              });

              console.log(
                JSON.stringify({
                  WG: {
                    ID: serverEvent.ID,
                    Properties: serverObj,
                    WGID: serverEvent.WGID,
                  },
                })
              );

              webSocket.send(
                JSON.stringify({
                  WG: {
                    ID: serverEvent.ID,
                    Properties: serverObj,
                    WGID: serverEvent.WGID,
                  },
                })
              );
            }

            // Horizontal and Bottom
            if (ID.includes('BOT')) {
              const topSubForm = JSON.parse(localStorage.getItem('horizontalSplitter'));
              const rigthSubForm = JSON.parse(localStorage.getItem('verticalSplitter'));
              const { Event } = topSubForm;
              const { Info } = Event;

              let rightWidth = null;

              const serverObj = {};

              if (rigthSubForm)
                rightWidth = 800 - (rigthSubForm.Event.Info[1] + rigthSubForm.Event.Info[3]);

              let bottomHeight = 800 - (Info[0] + 3);

              serverEvent.Properties.map((key) => {
                serverObj[key] = key == 'Size' ? [bottomHeight, rightWidth] : [Info[0] + 3, 0];
              });

              console.log(
                JSON.stringify({
                  WG: {
                    ID: serverEvent.ID,
                    Properties: serverObj,
                    WGID: serverEvent.WGID,
                  },
                })
              );

              webSocket.send(
                JSON.stringify({
                  WG: {
                    ID: serverEvent.ID,
                    Properties: serverObj,
                    WGID: serverEvent.WGID,
                  },
                })
              );
            }
          }

          //Handle the Splitter
          if (data?.Properties?.Type == 'Splitter') {
            const Splitter =
              data?.Properties.Style == 'Horz'
                ? localStorage.getItem('horizontalSplitter')
                : localStorage.getItem('verticalSplitter');
            const { Event } = JSON.parse(Splitter);
            const { Info } = Event;

            console.log(
              JSON.stringify({
                WG: {
                  ID: serverEvent.ID,
                  Properties: { Posn: [Info[0], Info[1]] },
                  WGID: serverEvent.WGID,
                },
              })
            );

            webSocket.send(
              JSON.stringify({
                WG: {
                  ID: serverEvent.ID,
                  Properties: { Posn: [Info[0], Info[1]] },
                  WGID: serverEvent.WGID,
                },
              })
            );
          }

          // handleData(JSON.parse(event.data).WG);
        }

        // Server emit from the server default Values
        else {
          const data = getObjectById(dataRef.current, serverEvent.ID);
          const jsondata = JSON.parse(data);

          const obj = serverEvent.Properties.map((key) => {
            let emitValue = null;
            let Type = jsondata.Properties.Type;
            let FieldType = jsondata.Properties.FieldType;

            switch (Type) {
              case 'Edit':
                emitValue = parseInt(jsondata?.Properties?.Text, 10);
                break;
            }

            const valueToEmit = jsondata.Properties.hasOwnProperty(key)
              ? jsondata.Properties[key]
              : emitValue;

            return {
              [key]:
                key == 'Value'
                  ? parseInt(valueToEmit, 10)
                  : key == 'Text'
                  ? valueToEmit.toString()
                  : valueToEmit,
            };
          });

          let serverObj = {};

          obj.forEach((obj, index) => {
            serverObj = { ...serverObj, ...obj };
          });

          console.log(
            JSON.stringify({
              WG: {
                ID: serverEvent.ID,
                Properties: serverObj,
                WGID: serverEvent.WGID,
              },
            })
          );
          webSocket.send(
            JSON.stringify({
              WG: {
                ID: serverEvent.ID,
                Properties: serverObj,
                WGID: serverEvent.WGID,
              },
            })
          );
        }
      } else if (event.data.includes('NQ')) {
        const nqEvent = JSON.parse(event.data).NQ;
        const element = document.getElementById(nqEvent.ID);
        element.focus();
      }
    };
  };

  useEffect(() => {
    dataRef.current = {};
    localStorage.clear();
    fetchData();
  }, [layout]);

  // console.log({ lastEvent });

  console.log('Appdata', dataRef.current);

  return (
    <AppDataContext.Provider value={{ socketData, dataRef, socket }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 10 }}>
        <select value={layout} onChange={(e) => setLayout(e.target.value)}>
          <option value='Initialise'>Initialise</option>
          <option value='Initialise(DemoSplitters)'>Splitters</option>
          <option value='Initialise(DemoScroll)'>Scroll</option>
          <option value='Initialise(DemoTabs)'>Tabs</option>
          <option value='Initialise(DemoRibbon)'>Ribbon</option>
          <option value='Initialise(DemoTreeView'>Tree View</option>
          <option value='Initialise(DemoLines)'>Lines</option>
          <option value='Initialise(DemoEdit)'>Edit</option>
        </select>
      </div>

      <SelectComponent data={dataRef.current['F1']} />
    </AppDataContext.Provider>
  );
};

export default App;
