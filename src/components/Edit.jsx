import {
  setStyle,
  extractStringUntilSecondPeriod,
  generateAsteriskString,
  calculateDateAfterDays,
  calculateDaysFromDate,
  rgbColor,
  getObjectById,
} from '../utils';
import { useState, useRef, useEffect } from 'react';
import { useAppData } from '../hooks';
import dayjs from 'dayjs';
import { NumericFormat } from 'react-number-format';

const Edit = ({
  data,
  value,
  event = '',
  row = '',
  column = '',
  location = '',
  values = [],
  formatString = '',
}) => {
  const { socket, dataRef, findDesiredData, handleData, addChangeEvent } = useAppData();

  const dateFormat = JSON.parse(getObjectById(dataRef.current, 'Locale'));

  const { ShortDate, Thousand, Decimal: decimalSeparator } = dateFormat?.Properties;

  let styles = { ...setStyle(data?.Properties) };
  const [inputType, setInputType] = useState('text');
  const [inputValue, setInputValue] = useState('');
  const [emitValue, setEmitValue] = useState('');
  const [initialValue, setInitialValue] = useState('');
  const dateInputRef = useRef();

  const {
    FieldType,
    MaxLength,
    FCol,
    Decimal,
    Visible,
    Event,
    FontObj,
    Size,
    EdgeStyle,
    Border = 0,
  } = data?.Properties;

  const hasTextProperty = data?.Properties.hasOwnProperty('Text');
  const hasValueProperty = data?.Properties.hasOwnProperty('Value');
  const isPassword = data?.Properties.hasOwnProperty('Password');
  const inputRef = useRef(null);
  const font = findDesiredData(FontObj && FontObj);
  const fontProperties = font && font?.Properties;

  const decideInputValue = () => {
    if (location == 'inGrid') {
      if (FieldType == 'Date') {
        setEmitValue(value);
        setInitialValue(value);

        const date = calculateDateAfterDays(value);

        return setInputValue(dayjs(date).format(ShortDate && ShortDate));
      }

      if (FieldType == 'LongNumeric') {
        setEmitValue(value);
        setInitialValue(value);
        return setInputValue(value);
      }
      setEmitValue(value);
      setInitialValue(value);
      return setInputValue(value);
    }
    if (hasTextProperty) {
      if (isPassword) {
        setInitialValue(generateAsteriskString(data?.Properties?.Text?.length));
        setEmitValue(data?.Properties?.Text);
        return setInputValue(generateAsteriskString(data?.Properties?.Text?.length));
      } else {
        setEmitValue(data?.Properties?.Text);
        setInitialValue(data?.Properties?.Text);
        return setInputValue(data?.Properties?.Text);
      }
    }
    if (hasValueProperty) {
      if (isPassword) {
        setInitialValue(generateAsteriskString(data?.Properties?.Value?.length));
        setEmitValue(data?.Properties?.Value);
        return setInputValue(generateAsteriskString(data?.Properties?.Value?.length));
      } else {
        setInitialValue(data?.Properties?.Value);
        setEmitValue(data?.Properties?.Value);
        return setInputValue(data?.Properties?.Value);
      }
    }
  };

  // check that the Edit is in the Grid or not

  const handleInputClick = () => {
    if (inputRef.current) {
      inputRef.current.select();
    }
  };

  const decideInputType = () => {
    if (FieldType == 'Numeric') {
      setInputType('number');
    } else if (FieldType == 'Date') {
      setInputType('date');
    }
  };

  useEffect(() => {
    decideInputType();
  }, []);

  useEffect(() => {
    decideInputValue();
  }, [data]);

  // Checks for the Styling of the Edit Field

  if (location == 'inGrid') {
    styles = { ...styles, border: 'none', color: FCol ? rgbColor(FCol) : 'black' };
  } else {
    styles = {
      ...styles,
      borderTop: 0,
      borderLeft: 0,
      borderRight: 0,
      borderBottom: '1px solid black',
      color: FCol ? rgbColor(FCol) : 'black',
    };
  }

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
          inputElement.select();
        }
      });
  };

  const handleKeyPress = (e) => {
    if (e.key == 'Enter') handleCellMove();
    const exists = Event && Event.some((item) => item[0] === 'KeyPress');
    if (!exists) return;

    const isAltPressed = e.altKey ? 4 : 0;
    const isCtrlPressed = e.ctrlKey ? 2 : 0;
    const isShiftPressed = e.shiftKey ? 1 : 0;
    const charCode = e.key.charCodeAt(0);
    let shiftState = isAltPressed + isCtrlPressed + isShiftPressed;

    console.log(
      JSON.stringify({
        Event: {
          EventName: 'KeyPress',
          ID: data?.ID,
          Info: [e.key, charCode, e.keyCode, shiftState],
        },
      })
    );

    socket.send(
      JSON.stringify({
        Event: {
          EventName: 'KeyPress',
          ID: data?.ID,
          Info: [e.key, charCode, e.keyCode, shiftState],
        },
      })
    );
  };

  const triggerChangeEvent = () => {
    const focusedId = localStorage.getItem('current-focus');

    const event2 = JSON.stringify({
      Event: {
        EventName: 'Change',
        ID: data?.ID,
        Info: emitValue,
      },
    });
    localStorage.setItem(data?.ID, event2);
    const exists = Event && Event.some((item) => item[0] === 'Change');
    if (!exists) return;

    const event = JSON.stringify({
      Event: {
        EventName: 'Change',
        ID: data?.ID,
        Info: [],
      },
    });

    localStorage.setItem('change-event', event);
  };

  const triggerCellChangedEvent = () => {
    const gridEvent = findDesiredData(extractStringUntilSecondPeriod(data?.ID));
    values[parseInt(row) - 1][parseInt(column) - 1] = emitValue;
    handleData(
      {
        ID: extractStringUntilSecondPeriod(data?.ID),
        Properties: {
          ...gridEvent.Properties,
          Values: values,
          CurCell: [parseInt(row), parseInt(column)],
        },
      },
      'WS'
    );

    const cellChangedEvent = JSON.stringify({
      Event: {
        EventName: 'CellChanged',
        ID: extractStringUntilSecondPeriod(data?.ID),
        Row: parseInt(row),
        Col: parseInt(column),
        Value: emitValue,
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
        Value: emitValue,
      },
    });

    localStorage.setItem(extractStringUntilSecondPeriod(data?.ID), updatedGridValues);

    // localStorage.setItem(extractStringUntilSecondPeriod(data?.ID), cellChangedEvent);
    const exists = event && event.some((item) => item[0] === 'CellChanged');
    if (!exists) return;
    console.log(cellChangedEvent);
    socket.send(cellChangedEvent);

    if (!formatString) return;

    console.log(formatCellEvent);
    socket.send(formatCellEvent);
  };

  const handleEditEvents = () => {
    // check that the Edit is inside the Grid
    if (location == 'inGrid') {
      if (value != emitValue) {
        triggerChangeEvent();
        triggerCellChangedEvent();
      }
    } else {
      if (initialValue != emitValue) triggerChangeEvent();
    }
  };

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

  // updating the styles depending upon the FontObj
  styles = {
    ...styles,
    fontFamily: fontProperties?.PName,
    fontSize: !fontProperties?.Size ? '12px' : `${fontProperties?.Size}px`,
    textDecoration: !fontProperties?.Underline
      ? 'none'
      : fontProperties?.Underline == 1
      ? 'underline'
      : 'none',
    fontStyle: !fontProperties?.Italic ? 'none' : fontProperties?.Italic == 1 ? 'italic' : 'none',
    fontWeight: !fontProperties?.Weight ? 0 : fontProperties?.Weight,
  };

  // Date Picker component

  if (inputType == 'date') {
    const handleTextClick = () => {
      dateInputRef.current.select();
      dateInputRef.current.showPicker();
    };

    const handleDateChange = (event) => {
      const selectedDate = dayjs(event.target.value).format(ShortDate);
      let value = calculateDaysFromDate(event.target.value) + 1;
      setInputValue(selectedDate);
      setEmitValue(value);
    };

    return (
      <div style={{ position: 'relative' }}>
        <input
          id={data?.ID}
          type='date'
          ref={dateInputRef}
          onChange={handleDateChange}
          style={{
            ...styles,
            position: 'absolute',
            zIndex: 1,
            display: 'none',
          }}
        />

        <input
          id={data?.ID}
          style={{
            ...styles,
            borderRadius: '2px',
            fontSize: '12px',
            zIndex: 1,
            display: Visible == 0 ? 'none' : 'block',
            paddingLeft: '5px',
          }}
          value={inputValue}
          type='text'
          readOnly
          onClick={handleTextClick}
          onBlur={() => {
            handleEditEvents();
          }}
          onKeyDown={(e) => handleKeyPress(e)}
        />
      </div>
    );
  }

  if (FieldType == 'LongNumeric' || FieldType == 'Numeric') {
    return (
      <NumericFormat
        ref={inputRef}
        onClick={handleInputClick}
        id={data?.ID}
        style={{
          ...styles,
          width: !Size ? '100%' : Size[1],
          borderRadius: '2px',
          zIndex: 1,
          display: Visible == 0 ? 'none' : 'block',
          paddingLeft: '5px',
          border:
            (Border && Border == '1') || (EdgeStyle && EdgeStyle == 'Ridge')
              ? '1px solid #6A6A6A'
              : 'none',
          textAlign: 'right',
        }}
        onValueChange={(value) => {
          const { floatValue } = value;
          setInputValue(floatValue);
          setEmitValue(floatValue);
        }}
        decimalScale={Decimal}
        value={inputValue}
        decimalSeparator={decimalSeparator}
        thousandSeparator={Thousand}
        onBlur={() => handleEditEvents()}
        onKeyDown={(e) => handleKeyPress(e)}
        onFocus={handleGotFocus}
      />
    );
  }

  return (
    <input
      id={data.ID}
      ref={inputRef}
      value={inputValue}
      onClick={handleInputClick}
      type={inputType}
      onChange={(e) => {
        if (FieldType == 'Char') {
          setEmitValue(e.target.value);
          setInputValue(e.target.value);
        }
        if (!FieldType) {
          setEmitValue(e.target.value);
          setInputValue(e.target.value);
        }
      }}
      onBlur={() => {
        handleEditEvents();
      }}
      onKeyDown={(e) => handleKeyPress(e)}
      style={{
        ...styles,
        width: !Size ? '100%' : Size[1],
        borderRadius: '2px',
        zIndex: 1,
        display: Visible == 0 ? 'none' : 'block',
        paddingLeft: '5px',
        border:
          (Border && Border == '1') || (EdgeStyle && EdgeStyle == 'Ridge')
            ? '1px solid #6A6A6A'
            : 'none',
      }}
      maxLength={MaxLength}
      onFocus={handleGotFocus}
    />
  );
};

export default Edit;
