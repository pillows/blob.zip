/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import Home from '../../app/page'

// Mock fetch to prevent network calls
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ success: true, files: [], count: 0 })
  })
) as jest.Mock

describe('Home Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders main heading and subtitle', () => {
    render(<Home />)
    
    expect(screen.getByText('🗂️ BlobZip')).toBeInTheDocument()
    expect(screen.getByText('Temporary file hosting made simple')).toBeInTheDocument()
  })

  it('renders upload section', () => {
    render(<Home />)
    
    expect(screen.getByText('Click to upload a file')).toBeInTheDocument()
    expect(screen.getByText('Maximum file size: 50MB')).toBeInTheDocument()
  })

  it('renders CLI section', () => {
    render(<Home />)
    
    expect(screen.getByText('TypeScript CLI Available')).toBeInTheDocument()
    expect(screen.getByText('Use the powerful TypeScript CLI for advanced file management:')).toBeInTheDocument()
  })

  it('renders cURL section', () => {
    render(<Home />)
    
    expect(screen.getByText('🔧 cURL Commands')).toBeInTheDocument()
    expect(screen.getByText('Use these cURL commands to interact with the API directly:')).toBeInTheDocument()
  })

  it('renders file upload area', () => {
    render(<Home />)
    
    const fileInput = screen.getByLabelText('Click to upload a file')
    expect(fileInput).toBeInTheDocument()
    expect(fileInput).toHaveAttribute('type', 'file')
  })

  it('renders cURL command examples', () => {
    render(<Home />)
    
    expect(screen.getByText('📤 Upload a File')).toBeInTheDocument()
    expect(screen.getByText('📋 List All Files')).toBeInTheDocument()
    expect(screen.getByText('⬇️ Download a File')).toBeInTheDocument()
    expect(screen.getByText('🗑️ Delete a File')).toBeInTheDocument()
  })

  it('renders copy buttons for cURL commands', () => {
    render(<Home />)
    
    const copyButtons = screen.getAllByTitle('Copy cURL command')
    expect(copyButtons.length).toBeGreaterThan(0)
  })

  it('shows files section with initial state', async () => {
    render(<Home />)
    
    // Wait for the component to load and show the files section
    expect(screen.getByText(/Uploaded Files/)).toBeInTheDocument()
  })
}) 