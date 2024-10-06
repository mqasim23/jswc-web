const Upload = ({ data }) => {
    return (
        <div>
            <input id={data.ID} type="file"/>
        </div>
    );
};

export default Upload;