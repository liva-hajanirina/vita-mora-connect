
import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, Share2, MoreHorizontal, Trash2, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";
import Comment from './Comment';
import { Textarea } from './ui/textarea';
import type { Profile } from '@/utils/profileService';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { checkIsLiked, toggleSocialLike } from '@/utils/socialLikeService';
import { Comment as CommentType, getCommentsByPostId, addComment, deleteComment } from '@/utils/socialCommentService';

interface SocialPostProps {
  username: string;
  avatar: string;
  time: string;
  content: string;
  image?: string;
  likes: number;
  comments: number;
  postId: string;
  userId?: string;
}

const SocialPost: React.FC<SocialPostProps> = ({ 
  username, 
  avatar, 
  time, 
  content, 
  image,
  likes: initialLikes,
  comments: initialComments,
  postId,
  userId
}) => {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(initialLikes);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<CommentType[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  useEffect(() => {
    if (userId) {
      const checkLike = async () => {
        const isLiked = await checkIsLiked(postId, userId);
        setLiked(isLiked);
      };
      
      checkLike();
    }
  }, [postId, userId]);

  const loadComments = async () => {
    const commentsData = await getCommentsByPostId(postId);
    setComments(commentsData);
  };

  useEffect(() => {
    if (showComments) {
      loadComments();
    }
  }, [showComments, postId]);

  const toggleLike = async () => {
    if (!userId) {
      toast.error("Vous devez être connecté pour aimer cette publication");
      return;
    }

    try {
      const { success, error } = await toggleSocialLike(postId, userId);
      
      if (!success) {
        throw new Error(error);
      }
      
      setLiked(!liked);
      setLikeCount(prev => prev + (liked ? -1 : 1));
      
      await supabase
        .from('social_posts')
        .update({ likes_count: likeCount + (liked ? -1 : 1) })
        .eq('id', postId);
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour des likes:', error);
      toast.error("Une erreur est survenue");
    }
  };

  const handleSubmitComment = async () => {
    if (!userId || !newComment.trim()) return;

    setIsSubmittingComment(true);
    try {
      const { success, error } = await addComment(postId, userId, newComment.trim());

      if (!success) {
        throw new Error(error);
      }

      setNewComment('');
      loadComments();
      toast.success("Commentaire ajouté");
    } catch (error: any) {
      console.error('Erreur lors de l\'ajout du commentaire:', error);
      toast.error(error.message);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const { success, error } = await deleteComment(commentId, postId, userId!);

      if (!success) {
        throw new Error(error);
      }

      loadComments();
      toast.success("Commentaire supprimé");
    } catch (error: any) {
      console.error('Erreur lors de la suppression du commentaire:', error);
      toast.error(error.message);
    }
  };

  const handleDeletePost = async () => {
    try {
      const { error } = await supabase
        .from('social_posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      toast.success("Publication supprimée");

      // The post will be removed from the list in the parent component
      // through the real-time subscription
    } catch (error: any) {
      toast.error(`Erreur lors de la suppression: ${error.message}`);
    }
  };

  const isAuthor = userId && postId.startsWith(userId);

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <img src={avatar} alt={username} className="w-10 h-10 rounded-full object-cover" />
          <div>
            <h4 className="font-bold text-vitamora-green">{username}</h4>
            <p className="text-xs text-gray-500">{time}</p>
          </div>
        </div>
        {isAuthor && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1">
                <MoreHorizontal size={20} className="text-gray-500" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                className="text-red-500 focus:text-red-500"
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Supprimer</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      
      <p className="my-2 whitespace-pre-line">{content}</p>
      
      {image && (
        <div className="my-3 rounded-lg overflow-hidden">
          <img src={image} alt="Publication" className="w-full h-auto" />
        </div>
      )}
      
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
        <button 
          onClick={toggleLike}
          className={`flex items-center gap-1 ${liked ? 'text-red-500' : 'text-gray-500'}`}
        >
          <Heart size={20} fill={liked ? "currentColor" : "none"} />
          <span>{likeCount}</span>
        </button>
        
        <button 
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-1 text-gray-500"
        >
          <MessageCircle size={20} />
          <span>{comments.length}</span>
        </button>
        
        <button className="flex items-center gap-1 text-gray-500">
          <Share2 size={20} />
          <span>Partager</span>
        </button>
      </div>

      {showComments && (
        <div className="mt-4 border-t border-gray-100 pt-4">
          <div className="space-y-4">
            {comments.map((comment) => (
              <Comment
                key={comment.id}
                content={comment.content}
                createdAt={comment.created_at}
                user={comment.user}
                canDelete={userId === comment.user_id}
                onDelete={() => handleDeleteComment(comment.id)}
              />
            ))}
          </div>

          {userId && (
            <div className="mt-4 flex gap-2">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Ajouter un commentaire..."
                className="flex-1 min-h-[60px]"
              />
              <button
                onClick={handleSubmitComment}
                disabled={isSubmittingComment || !newComment.trim()}
                className="bg-vitamora-orange text-white px-4 py-2 rounded-lg hover:bg-vitamora-orange/90 disabled:opacity-50"
              >
                <Send size={20} />
              </button>
            </div>
          )}
        </div>
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action ne peut pas être annulée. Cette publication sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeletePost}
              className="bg-red-500 hover:bg-red-600"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SocialPost;
