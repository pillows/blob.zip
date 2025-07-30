import UploadForm from '../../components/upload-form';

export default function TestUploadPage() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f3f4f6', 
      padding: '40px 20px' 
    }}>
      <UploadForm />
    </div>
  );
}