import { setStyle, extractStringUntilSecondPeriod, getElementPosition } from '../utils';
import { useAppData } from '../hooks';
import { useEffect, useState } from 'react';
import { useRef } from 'react';
import { getObjectById, getImageStyles } from '../utils';

const Button = ({
  data,
  inputValue,
  event = '',
  row = '',
  column = '',
  location = '',
  values = [],
}) => {
  const PORT = localStorage.getItem('PORT');

  const styles = setStyle(data?.Properties);
  const { socket, findDesiredData, dataRef, handleData } = useAppData();
  const { Picture, State, Visible, Event, Caption, Align } = data?.Properties;
  const inputRef = useRef();

  const [checkInput, setCheckInput] = useState();

  const [radioValue, setRadioValue] = useState(State ? State : 0);

  const hasCaption = data.Properties.hasOwnProperty('Caption');

  const isCheckBox = data?.Properties?.Style && data?.Properties?.Style == 'Check';

  const isRadio = data?.Properties?.Style && data?.Properties?.Style == 'Radio';

  const ImageData = findDesiredData(Picture && Picture[0]);

  const buttonEvent = data.Properties.Event && data?.Properties?.Event[0];

  const imageStyles = getImageStyles(Picture && Picture[1], PORT, ImageData);

  const decideInput = () => {
    if (location == 'inGrid') {
      return setCheckInput(inputValue);
    }
    setCheckInput(State && State);
  };

  useEffect(() => {
    decideInput();
  }, [data]);

  const handleCellChangedEvent = (value) => {
    const gridEvent = findDesiredData(extractStringUntilSecondPeriod(data?.ID));
    (values[parseInt(row) - 1][parseInt(column) - 1] = value ? 1 : 0),
      handleData(
        {
          ID: extractStringUntilSecondPeriod(data?.ID),
          Properties: {
            ...gridEvent.Properties,
            Values: values,
            CurCell: [row, column],
          },
        },
        'WS'
      );

    const triggerEvent = JSON.stringify({
      Event: {
        EventName: 'CellChanged',
        ID: extractStringUntilSecondPeriod(data?.ID),
        Row: parseInt(row),
        Col: parseInt(column),
        Value: value ? 1 : 0,
      },
    });

    const updatedGridValues = JSON.stringify({
      Event: {
        EventName: 'CellChanged',
        Values: values,
        CurCell: [row, column],
      },
    });

    const formatCellEvent = JSON.stringify({
      FormatCell: {
        Cell: [row, column],
        ID: extractStringUntilSecondPeriod(data?.ID),
        Value: value ? 1 : 0,
      },
    });

    localStorage.setItem(extractStringUntilSecondPeriod(data?.ID), updatedGridValues);
    const exists = event && event.some((item) => item[0] === 'CellChanged');
    if (!exists) return;
    console.log(triggerEvent);
    console.log(formatCellEvent);
    socket.send(formatCellEvent);
    socket.send(triggerEvent);
  };

  const handleSelectEvent = (value) => {
    const triggerEvent = JSON.stringify({
      Event: {
        EventName: 'Select',
        ID: data?.ID,
        Value: value ? 1 : 0,
      },
    });
    localStorage.setItem(data?.ID, triggerEvent);
    const exists = Event && Event.some((item) => item[0] === 'Select');
    if (!exists) return;
    console.log(triggerEvent);
    socket.send(triggerEvent);
  };

  const handleCheckBoxEvent = (value) => {
    if (location == 'inGrid') {
      handleSelectEvent(value);
      handleCellChangedEvent(value);
    } else {
      handleSelectEvent(value);
    }
  };

  const handleCellMove = () => {
    if (location !== 'inGrid') return;
    const parent = inputRef.current.parentElement;
    const grandParent = parent.parentElement;
    const superParent = grandParent.parentElement;
    const nextSibling = superParent.nextSibling;
    const element = nextSibling?.querySelectorAll('input');
    element &&
      element.forEach((inputElement) => {
        if (inputElement.id === data?.ID) {
          inputElement.focus();
        }
      });
  };

  const handleKeyPress = (e) => {
    if (e.key == 'Enter') handleCellMove();
  };

  //handle got focus event on all controls
  const handleGotFocus = () => {
    const previousFocusedId = localStorage.getItem('current-focus');
    const gotFocusEvent = JSON.stringify({
      Event: {
        EventName: 'GotFocus',
        ID: data?.ID,
        Info: !previousFocusedId ? [''] : [previousFocusedId],
      },
    });
    localStorage.setItem('current-focus', data?.ID);
    const exists = Event && Event.some((item) => item[0] === 'GotFocus');

    if (!exists || previousFocusedId == data?.ID) return;
    console.log(gotFocusEvent);
    socket.send(gotFocusEvent);
  };

  if (isCheckBox) {
    let checkBoxPosition = null;
    if (Align && Align == 'Left') {
      checkBoxPosition = { position: 'absolute', right: 0, top: 3 };
    } else if (!Align || Align == 'Right') {
      checkBoxPosition = { position: 'absolute', left: 0, top: 3 };
    }

    if (location == 'inGrid') {
      checkBoxPosition = { ...checkBoxPosition, marginLeft: '5px' };
    }

    return (
      <div
        style={{
          ...styles,
          zIndex: 1,
          display: Visible == 0 ? 'none' : 'block',
        }}
      >
        {Align && Align == 'Left' ? (
          <div style={{ fontSize: '12px', position: 'absolute', top: 0, left: 0 }}>{Caption}</div>
        ) : null}

        <input
          onFocus={handleGotFocus}
          ref={inputRef}
          onKeyDown={(e) => handleKeyPress(e)}
          id={data?.ID}
          type='checkbox'
          style={checkBoxPosition}
          checked={checkInput}
          onChange={(e) => {
            setCheckInput(e.target.checked);
            handleCheckBoxEvent(e.target.checked);
          }}
        />
        {!Align || Align == 'Right' ? (
          <div style={{ fontSize: '12px', position: 'absolute', top: 0, left: 16 }}>{Caption}</div>
        ) : null}
      </div>
    );
  }

  if (isRadio) {
    let radioPosition = null;
    if (Align && Align == 'Left') {
      radioPosition = { position: 'absolute', right: 0, top: 3 };
    } else if (!Align || Align == 'Right') {
      radioPosition = { position: 'absolute', left: 0, top: 3 };
    }

    const handleRadioSelectEvent = (value) => {
      const emitEvent = JSON.stringify({
        Event: {
          EventName: 'Select',
          ID: data?.ID,
          Value: value,
        },
      });
      const exists = Event && Event.some((item) => item[0] === 'Select');
      if (!exists) return;
      console.log(emitEvent);
      socket.send(emitEvent);
    };

    const handleRadioButton = (id, value) => {
      const parentElement = document.getElementById(extractStringUntilSecondPeriod(data?.ID));
      var radioInputs = parentElement.getElementsByTagName('input');
      for (var i = 0; i < radioInputs.length; i++) {
        var radioId = radioInputs[i].id;
        const button = JSON.parse(getObjectById(dataRef.current, radioId));
        handleData(
          {
            ID: button.ID,
            Properties: {
              ...button?.Properties,
              State: data?.ID == button?.ID ? 1 : 0,
            },
          },
          'WS'
        );
      }

      handleRadioSelectEvent(value);
    };

    useEffect(() => {
      setRadioValue(State);
    }, [data]);

    return (
      <div
        style={{
          ...styles,
          zIndex: 1,
          display: Visible == 0 ? 'none' : 'block',
        }}
      >
        {Align && Align == 'Left' ? (
          <div style={{ fontSize: '12px', position: 'absolute', top: 2, left: 0 }}>{Caption}</div>
        ) : null}
        <input
          onFocus={handleGotFocus}
          name={extractStringUntilSecondPeriod(data?.ID)}
          id={data?.ID}
          checked={radioValue}
          type='radio'
          value={Caption}
          onChange={(e) => {
            handleRadioButton(data?.ID, e.target.checked);
          }}
        />
        {!Align || Align == 'Right' ? (
          <div style={{ fontSize: '12px', position: 'absolute', top: 2, left: 16 }}>{Caption}</div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      id={data?.ID}
      onClick={() => {
        console.log(
          JSON.stringify({
            Event: {
              EventName: buttonEvent[0],
              ID: data?.ID,
            },
          })
        );

        socket.send(
          JSON.stringify({
            Event: {
              EventName: buttonEvent[0],
              ID: data?.ID,
            },
          })
        );

        handleGotFocus();
      }}
      style={{
        ...styles,
        border: '1px solid black',
        textAlign: 'center',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'white',
        borderRadius: '4px',
        borderColor: '#ccc',
        fontSize: '11px',
        cursor: 'pointer',
        zIndex: 1,
        display: Visible == 0 ? 'none' : 'flex',
      }}
    >
      {ImageData ? <div style={{ ...imageStyles, width: '100%', height: '100%' }}></div> : null}

      {hasCaption
        ? data?.Properties?.Caption?.includes('&')
          ? data?.Properties?.Caption?.substring(1)
          : data?.Properties?.Caption
        : null}
    </div>
  );
};

export default Button;
