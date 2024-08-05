import * as AppIcons from './RibbonIcons';
import { Row, Col } from 'reactstrap';
import { useAppData } from '../../hooks';
import { getObjectById } from '../../utils';
import { MdOutlineQuestionMark } from 'react-icons/md';

const CustomRibbonButtonGroup = ({ data }) => {
  const { socket, dataRef } = useAppData();
  const PORT = localStorage.getItem('PORT');
  let ImageList = JSON.parse(localStorage.getItem('ImageList'));


  const { Captions, Icons, Event, ImageIndex, ImageListObj } = data?.Properties;

  const colSize = Captions?.length == 4 ? 6 : 12;

  const handleSelectEvent = (info) => {
    const selectEvent = JSON.stringify({
      Event: {
        EventName: 'Select',
        ID: data?.ID,
        Info: [info],
      },
    });
    const exists = Event && Event.some((item) => item[0] === 'Select');
    if (!exists) return;
    console.log(selectEvent);
    socket.send(selectEvent);
  };

  const handleButtonEvent = (info) => {
    handleSelectEvent(info);
  };

  let ImagesData

  if (ImageListObj) {
    if (Array.isArray(ImageListObj)) {
      ImagesData = ImageListObj?.map((id) => {
        return id && JSON.parse(getObjectById(dataRef.current, id));
      });

      // console.log({ ImagesData });
    } else {
      const ID = ImageListObj.split('.')[1];
      ImageList = ID && JSON.parse(getObjectById(dataRef.current, ID));
    }
    // const ID = getStringafterPeriod(ImageListObj);
    // ImageList = ID && JSON.parse(getObjectById(dataRef.current, ID));
  }

  // console.log({ Icons });

  // console.log({ AppIcons });

  console.log({Captions, ImagesData})



  return (
    <Row>
      {Captions.map((title, i) => {
        
        // i = 0
        const imageIndex = i;
        const image = ImagesData?.[imageIndex] || ImageList;
        const iconKey = Icons?.[i] || 'MdOutlineQuestionMark';
        const IconComponent = AppIcons?.[iconKey] || MdOutlineQuestionMark;

        return (
          <Col
            key={`col-${i}`}
            id={`${data?.ID}-${i}`}
            md={colSize}
            className='d-flex align-items-center justify-content-center'
            style={{ cursor: 'pointer' }}
            onClick={() => handleButtonEvent(i + 1)}
          >
            {image ? (
              <img
                style={{
                  width: ImageList?.Properties?.Size?.[1],
                  height: ImageList?.Properties?.Size?.[0],
                }}
                src={`http://localhost:${PORT}/${image?.Properties?.Files?.[imageIndex]}`}
                alt={title}
              />
            ) : (
              <IconComponent size={35} />
            )}
            <div style={{ fontSize: '12px', textAlign: 'center', textOverflow: 'ellipsis' }}>
              {title}
            </div>
          </Col>
        );
      })}
    </Row>
  );
};

export default CustomRibbonButtonGroup;
