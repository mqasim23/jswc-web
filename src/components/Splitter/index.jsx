import { checkPeriod, excludeKeys } from '../../utils';
import { useAppData } from '../../hooks';
import SelectComponent from '../SelectComponent';
import SplitPane, { Pane } from 'split-pane-react';
import 'split-pane-react/esm/themes/default.css';
import { useRef, useState } from 'react';

const Splitter = ({ data }) => {
  const { dataRef } = useAppData();
  const { socket } = useAppData();
  const verticalSplitter = useRef();

  const { SplitObj1, SplitObj2 } = data?.Properties;
  const [sizes, setSizes] = useState([100, '30%', 'auto']);
  const [horizontalSize, setHorizontalSize] = useState([100, 200, 'auto']);

  const periodSplitObj1 = checkPeriod(SplitObj1);
  const periodSplitObj2 = checkPeriod(SplitObj2);

  const keySplit1 = SplitObj1?.split('.');
  const keySplit2 = SplitObj2?.split('.');

  let firstFormData = null;
  let secondFormData = null;

  if (periodSplitObj1 == 1 && periodSplitObj2 == 1) {
    firstFormData = dataRef.current[keySplit1[0]][keySplit1[1]];
    secondFormData = dataRef.current[keySplit2[0]][keySplit2[1]];
  }

  if (periodSplitObj1 == 2 && periodSplitObj2 == 2) {
    firstFormData = dataRef.current[keySplit1[0]][keySplit1[1]][keySplit1[2]];
    secondFormData = dataRef.current[keySplit2[0]][keySplit2[1]][keySplit2[2]];
  }

  const updatedFirstForm = excludeKeys(firstFormData);
  const updatedSecondForm = excludeKeys(secondFormData);

  const layoutCSS = {
    height: '100%',
  };

  // Horizontal Split
  console.log({data})
  console.log('Check Splitter', data?.Properties?.Style && data?.Properties?.Style == 'Horz');

  if (data?.Properties?.Style && data?.Properties?.Style == 'Horz') {
    console.log('in Horizontal SPlitter', data);

    return (
      <div style={{ height: 800, background: 'white' }}>
        <SplitPane
          split='horizontal'
          sizes={horizontalSize}
          onChange={(sizes) => {
            localStorage.setItem('coordinates', JSON.stringify(sizes));
            setHorizontalSize(sizes);
          }}
          onDragEnd={(e) => {
            try {
              const coordinates = JSON.parse(localStorage.getItem('coordinates'));

              console.log(
                JSON.stringify({
                  Event: {
                    EventName: data?.Properties?.Event[0],
                    ID: data.ID,
                    Info: [Math.round(coordinates[0]), 0, 3, 494],
                  },
                })
              );

              socket.send(
                JSON.stringify({
                  Event: {
                    EventName: data?.Properties?.Event[0],
                    ID: data.ID,
                    Info: [Math.round(coordinates[0]), 0, 3, 494],
                  },
                })
              );

              localStorage.setItem(
                'horizontalSplitter',
                JSON.stringify({
                  Event: {
                    EventName: data?.Properties?.Event[0],
                    ID: data.ID,
                    Info: [Math.round(coordinates[0]), 0, 800, 3],
                  },
                })
              );
            } catch (error) {
              console.log({ error });
            }
          }}
        >
          <div>
            <div
              style={{
                height: data?.Properties?.Posn[0],
                position: 'relative',
                background: 'white',
              }}
            >
              {Object.keys(updatedFirstForm).map((key) => (
                <SelectComponent data={updatedFirstForm[key]} />
              ))}
            </div>
          </div>
          <div style={{ border: '1px solid #F0F0F0' }}>
            <div style={{ position: 'absolute', flex: 1, background: 'white' }}>
              {Object.keys(updatedSecondForm).map((key) => (
                <SelectComponent data={updatedSecondForm[key]} />
              ))}
            </div>
          </div>
        </SplitPane>
      </div>
    );
  }

  // Vertical Split

  //Event Information

  // Info [0,left,800,3]
  // 800 is the height of the Splitter and 3 is the width of the splitter
  //0 is the top position of the Splitter and left is the left position of the Splitter

  return (
    <SplitPane
      split='vertical'
      sizes={sizes}
      onChange={(value) => {
        localStorage.setItem('coordinates', JSON.stringify(value));
        setSizes(value);
      }}
      onDragEnd={(e) => {
        const coordinates = JSON.parse(localStorage.getItem('coordinates'));

        console.log(
          JSON.stringify({
            Event: {
              EventName: data?.Properties?.Event[0],
              ID: data.ID,
              Info: [0, Math.round(coordinates[0]), 800, 3],
            },
          })
        );

        socket.send(
          JSON.stringify({
            Event: {
              EventName: data?.Properties?.Event[0],
              ID: data.ID,
              Info: [0, Math.round(coordinates[0]), 800, 3],
            },
          })
        );

        localStorage.setItem(
          'verticalSplitter',
          JSON.stringify({
            Event: {
              EventName: data?.Properties?.Event[0],
              ID: data.ID,
              Info: [0, Math.round(coordinates[0]), 800, 3],
            },
          })
        );
      }}
    >
      {/* left Subform */}
      <Pane minSize={0} maxSize='100%'>
        <div style={{ ...layoutCSS, border: '1px solid #F0F0F0', background: 'white' }}>
          <div
            style={{
              width: data?.Properties?.Posn[1],
              background: 'white',
              position: 'relative',
            }}
          >
            {Object.keys(updatedFirstForm).map((key) => (
              <SelectComponent data={updatedFirstForm[key]} />
            ))}
          </div>
        </div>
      </Pane>
      {/* Right SubForm */}
      <div style={{ ...layoutCSS, background: 'white' }}>
        <div style={{ background: 'white' }}>
          {Object.keys(updatedSecondForm).map((key) => (
            <SelectComponent data={updatedSecondForm[key]} />
          ))}
        </div>
      </div>
    </SplitPane>
  );
};

export default Splitter;
