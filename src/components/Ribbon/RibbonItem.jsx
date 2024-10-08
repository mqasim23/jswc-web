import { RibbonGroupItem } from 'react-bootstrap-ribbon';
import { excludeKeys, parseFlexStyles } from '../../utils';
import SelectComponent from '../SelectComponent';

const CustomRibbonItem = ({ data }) => {
  const updatedData = excludeKeys(data);

  const { Size, CSS } = data?.Properties;
  const customStyles = parseFlexStyles(CSS)
  const size = Size || 12;

  return (
    <div
      id={data?.ID}
      style={{ display: 'flex', justifyContent: 'center',...customStyles }}
      className={`col-${size}`}
    >
      {Object.keys(updatedData).map((key) => {
        return <SelectComponent data={updatedData[key]} />;
      })}
    </div>
  );
};

export default CustomRibbonItem;
