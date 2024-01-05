import Form from './Form';
import MenuBar from './MenuBar';
import Menu from './Menu';
import Grid from './Grid';
import Edit from './Edit';
import Button from './Button';
import Combo from './Combo';
import Label from './Label';
import Treeview from './Treeview';
import List from './List';
import Splitter from './Splitter';
import Group from './Group';
import ScrollBar from './ScrollBar';
import TabControl from './TabControl';
import TabButton from './TabButton';
// import SubForm from './SubForm';
import TextArea from './TextArea';
import CustomRibbon from './Ribbon';
import CustomRibbonGroup from './Ribbon/RibbonGroup';
import CustomRibbonItem from './Ribbon/RibbonItem';
import CustomRibbonButton from './Ribbon/RibbonButton';
import CustomRibbonButtonGroup from './Ribbon/RibbonButtonGroup';
import Poly from './Polygon';
import Rectangle from './Rectangle';
import ImageSubForm from './ImgSubForm';
import ShapeSubForm from './ShapeSubForm';
import Text from './Text';
import Timer from './Timer';
import ListView from './ListView';
import SubForm from './DynamicSubForm';
import Image from './Image';

const SelectComponent = ({
  data,
  inputValue = '',
  event = '',
  row = '',
  column = '',
  location,
  inSplitter = null,
  values = [],
}) => {
  if (data?.Properties?.Type == 'Form') return <Form data={data} />;
  if (data?.Properties?.Type == 'MenuBar')
    return (
      <div
        style={{
          translate: '0% -100%',
          position: 'relative',
          zIndex: '2',
        }}
      >
        <MenuBar data={data} />
      </div>
    );
  if (data?.Properties?.Type == 'Menu') return <Menu data={data} />;
  if (data?.Properties?.Type == 'Grid') return <Grid data={data} />;
  if (data?.Properties?.Type == 'Edit' && data?.Properties?.Style !== 'Multi')
    return (
      <div
        style={
          location == 'inGrid'
            ? {
                display: 'flex',
                justifyContent:
                  data?.Properties?.FieldType == 'Numeric' ||
                  data?.Properties?.FieldType == 'LongNumeric'
                    ? 'end'
                    : 'start',
              }
            : null
        }
      >
        <Edit
          values={values}
          location={location}
          data={data}
          value={inputValue}
          event={event}
          row={row}
          column={column}
        />
      </div>
    );
  if (data?.Properties?.Type == 'Button')
    return (
      <Button
        data={data}
        location={location}
        inputValue={inputValue}
        event={event}
        row={row}
        column={column}
        values={values}
      />
    );
  if (data?.Properties?.Type == 'Combo')
    return (
      <Combo
        data={data}
        location={location}
        value={inputValue}
        event={event}
        row={row}
        column={column}
        values={values}
      />
    );
  if (data?.Properties?.Type == 'Label') return <Label gridValue={inputValue} data={data} />;
  if (data?.Properties?.Type == 'TreeView') return <Treeview data={data} />;
  // if (data?.Properties?.Type == 'SubForm' && data?.Properties.hasOwnProperty('TabObj'))
  //   return <SubForm data={data} />;
  // Image Subform
  // if (data?.Properties?.Type == 'SubForm' && data?.Properties.hasOwnProperty('Picture'))
  //   return <ImageSubForm data={data} />;

  if (data?.Properties?.Type == 'List') return <List data={data} />;
  if (data?.Properties?.Type == 'Splitter') return <Splitter data={data} />;
  if (data?.Properties?.Type == 'Group') return <Group data={data} />;
  if (data?.Properties?.Type == 'Scroll') return <ScrollBar data={data} />;
  if (data?.Properties?.Type == 'TabControl') return <TabControl data={data} />;
  if (data?.Properties?.Type == 'TabButton') return <TabButton data={data} />;
  if (data?.Properties?.Type == 'Edit' && data?.Properties?.Style == 'Multi') {
    return <TextArea data={data} />;
  }
  if (data?.Properties?.Type == 'Ribbon') return <CustomRibbon data={data} />;
  if (data?.Properties?.Type == 'RibbonGroup') return <CustomRibbonGroup data={data} />;
  if (data?.Properties?.Type == 'RibbonGroupItem') return <CustomRibbonItem data={data} />;
  if (data?.Properties?.Type == 'RibbonButton') return <CustomRibbonButton data={data} />;
  if (data?.Properties?.Type == 'RibbonButtonGroup') return <CustomRibbonButtonGroup data={data} />;

  if (data?.Properties?.Type == 'Poly') return <Poly data={data} />;
  if (data?.Properties?.Type == 'Rect') return <Rectangle data={data} />;
  if (data?.Properties?.Type == 'SubForm') {
    return <SubForm data={data} />;
  }

  if (data?.Properties?.Type == 'Text') return <Text data={data} />;

  if (data?.Properties?.Type == 'Timer') return <Timer data={data} />;
  if (data?.Properties?.Type == 'ListView') return <ListView data={data} />;
  if (data?.Properties?.Type == 'Image') return <Image data={data} />;
};

export default SelectComponent;
